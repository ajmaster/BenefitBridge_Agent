"""Deterministic guided chat workflow for AidAtlasCA."""

from __future__ import annotations

import re
from typing import Any

from app.graph import run_benefitbridge_graph
from app.policies.privacy import RedactionResult, redact_pii
from app.policies.safety import detect_safety_route, fixed_handoff_text
from app.services.a2ui_contract import a2ui_action, validate_a2ui_templates
from app.services.source_store import DEFAULT_STORE
from app.tools.jurisdiction import lookup_county_from_location
from app.tools.local_resources import find_local_resources

NEED_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("food", ("food", "calfresh", "grocer", "meal", "comida")),
    ("food today", ("food today", "no food", "hungry today")),
    ("health coverage", ("health", "medi-cal", "medical", "covered california")),
    ("utility help", ("utility", "utilities", "energy", "liheap", "bill help")),
    (
        "phone discount",
        ("phone discount", "lifeline", "cell phone", "internet discount"),
    ),
    ("cash aid", ("cash", "calworks", "caap", "general assistance")),
    ("child care", ("child care", "childcare", "day care", "daycare")),
    ("school meals", ("school meals", "school lunch", "school breakfast")),
    (
        "ihss in-home support",
        ("ihss", "in-home support", "in home support", "caregiver"),
    ),
    ("legal aid", ("legal aid", "lawyer", "eviction papers", "legal help")),
    ("housing", ("housing", "rent", "eviction", "homeless")),
    ("shelter", ("shelter", "sleeping outside", "sleeping in my car", "tonight")),
    ("WIC", ("wic", "pregnant", "breastfeeding", "baby", "infant")),
)


def _finalize_chat_response(response: dict[str, Any]) -> dict[str, Any]:
    events = [str(event) for event in response.get("events", [])]
    templates = [_progress_template(events), *response.get("ui_templates", [])]
    response["ui_templates"] = validate_a2ui_templates(templates)
    response["a2ui"] = {
        "mime_type": "application/json+a2ui",
        "validated": True,
        "template_count": len(response["ui_templates"]),
    }
    return response


def run_chat_workflow(
    messages: list[dict[str, str]], snapshot: dict[str, Any]
) -> dict[str, Any]:
    """Collect safe prep facts and return A2UI templates for the frontend."""

    base_snapshot = _merge_snapshot(snapshot, {})
    events = ["chat_received", "privacy_screen"]
    latest_user_text = _latest_user_text(messages)
    redaction = _scan_chat_privacy(latest_user_text, base_snapshot)
    if redaction.blocked:
        return _finalize_chat_response(
            {
                "route": "privacy_block",
                "message": (
                    "I detected sensitive details. Please remove SSNs, credentials, "
                    "case numbers, card numbers, private IDs, and exact addresses "
                    "before we continue."
                ),
                "events": events,
                "snapshot": _redact_snapshot_for_response(base_snapshot),
                "snapshot_patch": {},
                "next_questions": [
                    "Share only city/county/ZIP, general household size, broad income range, and benefit needs."
                ],
                "ui_templates": [_privacy_template(redaction.findings)],
                "redaction": redaction.to_dict(),
            }
        )

    safe_text = redaction.redacted_text
    events.append("safety_triage")
    safety = detect_safety_route(safe_text)
    if safety.suppress_normal_packet:
        return _finalize_chat_response(
            {
                "route": safety.route,
                "message": fixed_handoff_text(safety.route),
                "events": events,
                "snapshot": base_snapshot,
                "snapshot_patch": {},
                "next_questions": [],
                "ui_templates": [_safety_template(safety.route)],
                "safety": safety.to_dict(),
            }
        )

    events.append("fact_extraction")
    snapshot_patch = _extract_snapshot_patch(safe_text, base_snapshot)
    next_snapshot = _merge_snapshot(base_snapshot, snapshot_patch)
    next_questions = _next_questions(next_snapshot)
    templates = [_facts_template(next_snapshot, snapshot_patch)]

    if next_questions:
        templates.append(_questions_template(next_questions))

    if not _ready_for_packet(next_snapshot):
        source_answer = _general_source_answer(
            safe_text,
            events,
            next_snapshot,
            snapshot_patch,
            next_questions,
            templates,
        )
        if source_answer is not None:
            return source_answer
        return _finalize_chat_response(
            {
                "route": "intake",
                "message": (
                    "I can guide the prep conversation. I need city/county/ZIP and "
                    "the main help areas before I can point you to source-backed next steps."
                ),
                "events": events,
                "snapshot": next_snapshot,
                "snapshot_patch": snapshot_patch,
                "next_questions": next_questions,
                "ui_templates": templates,
            }
        )

    events.append("deterministic_graph")
    graph_result = run_benefitbridge_graph(safe_text, next_snapshot)
    route = graph_result.get("route", "intake")
    if route != "standard_benefits_prep" or "packet" not in graph_result:
        return _finalize_chat_response(
            {
                "route": route,
                "message": graph_result.get(
                    "message",
                    "I could not prepare a packet for that geography or safety route.",
                ),
                "events": events + graph_result.get("events", []),
                "snapshot": next_snapshot,
                "snapshot_patch": snapshot_patch,
                "next_questions": next_questions,
                "ui_templates": [*templates, _route_template(graph_result)],
                **(
                    {"jurisdiction": graph_result["jurisdiction"]}
                    if "jurisdiction" in graph_result
                    else {}
                ),
            }
        )

    packet = graph_result["packet"]
    resources = _resources_for_snapshot(next_snapshot)
    templates.extend(
        [
            _benefit_paths_template(packet),
            _resources_template(resources),
            _source_links_template(packet),
            _packet_summary_template(packet),
            *_document_kit_templates(packet, resources),
        ]
    )
    return _finalize_chat_response(
        {
            "route": "packet_ready",
            "message": (
                "I prepared source-backed directions for the benefit areas worth checking. "
                "Official agencies decide eligibility and amounts; call local resources before going."
            ),
            "events": events + graph_result.get("events", []),
            "snapshot": next_snapshot,
            "snapshot_patch": snapshot_patch,
            "next_questions": next_questions,
            "ui_templates": templates,
            "packet": packet,
            "resources": resources,
            "validation": graph_result.get("validation"),
            "jurisdiction": graph_result.get("jurisdiction"),
        }
    )


def _latest_user_text(messages: list[dict[str, str]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user" and message.get("content"):
            return str(message["content"])
    return ""


def _privacy_context(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("tracking", "violent", "stalking", "unsafe")):
        return "dv"
    if any(term in lowered for term in ("shelter", "sleeping", "homeless")):
        return "homelessness"
    return "standard"


def _scan_chat_privacy(text: str, snapshot: dict[str, Any]) -> RedactionResult:
    current = redact_pii(text, context=_privacy_context(text))
    findings = set(current.findings)
    blocked = current.blocked or "exact_address" in current.findings

    for snapshot_text in _walk_text_values(snapshot):
        result = redact_pii(snapshot_text, context="standard")
        findings.update(result.findings)
        blocked = blocked or result.blocked or "exact_address" in result.findings

    return RedactionResult(
        redacted_text=current.redacted_text,
        findings=sorted(findings),
        blocked=blocked,
    )


def _walk_text_values(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        values: list[str] = []
        for item in value.values():
            values.extend(_walk_text_values(item))
        return values
    if isinstance(value, (list, tuple, set)):
        values = []
        for item in value:
            values.extend(_walk_text_values(item))
        return values
    return []


def _redact_snapshot_for_response(snapshot: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in snapshot.items():
        if isinstance(value, str):
            redacted[key] = redact_pii(value, context="standard").redacted_text
        elif isinstance(value, list):
            redacted[key] = [
                redact_pii(item, context="standard").redacted_text
                if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            redacted[key] = value
    return redacted


def _extract_snapshot_patch(text: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    lowered = text.lower()
    patch: dict[str, Any] = {}

    if "español" in lowered or "spanish" in lowered or "prefiero" in lowered:
        patch["language"] = "es"

    for hint, value in DEFAULT_STORE.location_hints:
        if _location_hint_matches(lowered, hint):
            patch["location_text"] = value
            break

    needs = set(snapshot.get("needs") or [])
    for need, keywords in NEED_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            needs.add(need)
    if needs:
        patch["needs"] = sorted(needs)

    if "food today" in lowered or "no food" in lowered:
        patch["food_need_today"] = True
    if any(term in lowered for term in ("utility", "utilities", "energy", "liheap")):
        patch["utilities_need"] = True

    adults = _first_int_match(lowered, r"(\d+)\s+adults?")
    if adults is not None:
        patch["adults"] = adults

    household = _first_int_match(
        lowered, r"(\d+)\s+(?:people|person|household members?)"
    )
    if household is not None:
        patch["household_size"] = household

    child_ages = _child_ages(lowered)
    if child_ages:
        patch["children_ages"] = child_ages
        if "household_size" not in patch and snapshot.get("adults"):
            patch["household_size"] = int(snapshot["adults"]) + len(child_ages)

    if any(term in lowered for term in ("no income", "very low", "low income")):
        patch["income_range_monthly"] = "very low or no income"
    elif any(term in lowered for term in ("reduced hours", "low monthly", "low range")):
        patch["income_range_monthly"] = "low monthly range"

    if any(
        term in lowered
        for term in ("sleeping in my car", "sleeping outside", "homeless")
    ):
        patch["housing_status"] = "unstable"
    elif any(
        term in lowered for term in ("rent stressed", "behind on rent", "eviction")
    ):
        patch["housing_status"] = "housed but rent stressed"
    elif "housed" in lowered:
        patch["housing_status"] = "housed"

    return patch


def _first_int_match(text: str, pattern: str) -> int | None:
    match = re.search(pattern, text)
    if not match:
        return None
    value = int(match.group(1))
    return value if 0 <= value <= 20 else None


def _child_ages(text: str) -> list[int]:
    match = re.search(r"(?:children|kids|child).*?(?:ages?|age)\s+([0-9,\sand]+)", text)
    if not match:
        return []
    values = [int(item) for item in re.findall(r"\d+", match.group(1))]
    return [value for value in values if 0 <= value <= 20][:12]


def _merge_snapshot(snapshot: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = {
        "language": snapshot.get("language", "en"),
        "location_text": snapshot.get("location_text", ""),
        "household_size": snapshot.get("household_size"),
        "adults": snapshot.get("adults"),
        "children_ages": snapshot.get("children_ages", []),
        "needs": snapshot.get("needs", []),
        "income_range_monthly": snapshot.get("income_range_monthly"),
        "housing_status": snapshot.get("housing_status", "unknown"),
        "utilities_need": bool(snapshot.get("utilities_need", False)),
        "food_need_today": bool(snapshot.get("food_need_today", False)),
        "safety_sensitive": bool(snapshot.get("safety_sensitive", False)),
    }
    for key, value in patch.items():
        if value not in (None, "", []):
            merged[key] = value
    return merged


def _next_questions(snapshot: dict[str, Any]) -> list[str]:
    questions = []
    if not snapshot.get("location_text"):
        questions.append(
            "What city, county, or ZIP should I use? Please avoid exact addresses."
        )
    if not snapshot.get("needs"):
        questions.append(
            "Which help areas should we prepare for: food, health coverage, WIC, utilities, cash aid, housing, or shelter?"
        )
    if not snapshot.get("household_size"):
        questions.append(
            "How many people are in the household, and how many are adults?"
        )
    if not snapshot.get("income_range_monthly"):
        questions.append(
            "What broad income range should we use, such as no income, reduced hours, or low monthly range?"
        )
    if snapshot.get("housing_status") in (None, "", "unknown"):
        questions.append(
            "What broad housing status should we use: housed, rent stressed, unstable, or unknown?"
        )
    return questions[:4]


def _ready_for_packet(snapshot: dict[str, Any]) -> bool:
    return bool(snapshot.get("location_text") and snapshot.get("needs"))


def _general_source_answer(
    text: str,
    events: list[str],
    snapshot: dict[str, Any],
    snapshot_patch: dict[str, Any],
    next_questions: list[str],
    templates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    lowered = text.lower()
    source_ids: list[str] = []
    if "ihss" in lowered or "in-home" in lowered or "in home" in lowered:
        source_ids = ["cdss_ihss_home", "dhcs_county_offices", "cdss_county_offices"]
        answer = (
            "IHSS is a California in-home support program administered through "
            "county processes. I can help prepare broad questions and documents "
            "for an agency conversation; official agencies decide eligibility and "
            "service authorizations."
        )
    elif "calworks" in lowered:
        source_ids = ["cdss_calworks_home", "benefitscal_info", "cdss_county_offices"]
        answer = (
            "CalWORKs is California's family cash-aid and services program, "
            "operated locally by county welfare departments. I can help prepare "
            "questions and documents, but official agencies decide eligibility and amounts."
        )
    elif "child care" in lowered or "childcare" in lowered:
        source_ids = [
            "cdss_child_care_development",
            "cdss_county_offices",
            "ca_211_home",
        ]
        answer = (
            "California child care support questions should be routed through "
            "official child care and county resources. I can help gather ages, "
            "schedule needs, and county details without claiming provider availability."
        )
    elif "school meal" in lowered or "school lunch" in lowered:
        source_ids = ["cde_school_nutrition_home", "ca_211_home"]
        answer = (
            "School meal questions should be checked with the school or district "
            "and California Department of Education school nutrition resources. "
            "I do not claim same-day meal availability."
        )
    elif "legal" in lowered or "lawyer" in lowered or "court" in lowered:
        source_ids = ["california_courts_self_help", "ca_211_home"]
        answer = (
            "For legal issues, I can route to legal information and legal-aid "
            "handoffs, but I cannot give legal advice or choose a filing strategy."
        )
    else:
        return None

    citations = [
        DEFAULT_STORE.citation(source_id).to_dict()
        for source_id in source_ids
        if source_id in DEFAULT_STORE.approved_sources_by_id
    ]
    return _finalize_chat_response(
        {
            "route": "source_answer",
            "message": answer,
            "events": [*events, "official_source_retrieval"],
            "snapshot": snapshot,
            "snapshot_patch": snapshot_patch,
            "next_questions": next_questions
            or ["Share a city/county/ZIP and main needs when you want a prep packet."],
            "ui_templates": [
                *templates,
                _template(
                    "source-answer",
                    "source_sheet",
                    "Approved Source Answer",
                    tone="source",
                    body=answer,
                    items=[
                        {
                            "title": citation.get("source_title")
                            or citation["source_id"],
                            "subtitle": citation.get("agency_owner"),
                            "links": [
                                {
                                    "label": "Open source",
                                    "href": citation.get("url", ""),
                                }
                            ]
                            if citation.get("url")
                            else [],
                        }
                        for citation in citations
                    ],
                    actions=[
                        a2ui_action(
                            "open_resource_url",
                            citation.get("source_title") or citation["source_id"],
                            href=citation.get("url"),
                        )
                        for citation in citations[:3]
                        if citation.get("url")
                    ],
                    citations=citations,
                ),
            ],
        }
    )


def _resources_for_snapshot(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    location_text = str(snapshot.get("location_text") or "")
    jurisdiction = lookup_county_from_location(location_text)
    county = str(
        jurisdiction.get("county") or jurisdiction.get("city") or location_text
    )
    resources: list[dict[str, Any]] = []
    for need in snapshot.get("needs", [])[:4]:
        need_type = _resource_need_type(str(need))
        for resource in find_local_resources(
            county,
            need_type,
            language=snapshot.get("language"),
            safety_sensitive=bool(snapshot.get("safety_sensitive", False)),
        ):
            if resource["id"] not in {item["id"] for item in resources}:
                resources.append(resource)
    return resources[:5]


def _resource_need_type(need: str) -> str:
    lowered = need.lower()
    if "legal" in lowered or "lawyer" in lowered:
        return "legal_aid"
    if "phone" in lowered or "lifeline" in lowered:
        return "benefits_office"
    if "child care" in lowered or "school" in lowered or "ihss" in lowered:
        return "benefits_office"
    if "shelter" in lowered or "housing" in lowered:
        return "shelter"
    if "wic" in lowered:
        return "wic"
    if "health" in lowered:
        return "health"
    if "utility" in lowered or "liheap" in lowered or "energy" in lowered:
        return "utility"
    if "cash" in lowered:
        return "benefits_office"
    return "food"


def _location_hint_matches(text: str, hint: str) -> bool:
    if len(hint) <= 3:
        return bool(re.search(rf"(?<![a-z0-9]){re.escape(hint)}(?![a-z0-9])", text))
    return hint in text


def _template(
    template_id: str,
    template_type: str,
    title: str,
    *,
    tone: str = "info",
    subtitle: str | None = None,
    body: str | None = None,
    items: list[dict[str, Any]] | None = None,
    actions: list[dict[str, str]] | None = None,
    citations: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "id": template_id,
        "type": template_type,
        "title": title,
        "tone": tone,
        "subtitle": subtitle,
        "body": body,
        "items": items or [],
        "actions": actions or [],
        "citations": citations or [],
    }


def _progress_template(events: list[str]) -> dict[str, Any]:
    labels = {
        "chat_received": "Chat turn received",
        "privacy_screen": "Privacy screen",
        "safety_triage": "Safety triage",
        "fact_extraction": "Fact extraction",
        "deterministic_graph": "ADK graph handoff",
        "consent_privacy": "Consent and privacy",
        "jurisdiction": "Jurisdiction",
        "official_source_retrieval": "Official sources",
        "benefit_path_matcher": "Benefit path matching",
        "safety_and_grounding_critic": "Safety and grounding critic",
        "eval_telemetry": "Redacted telemetry",
    }
    return _template(
        "workflow-progress",
        "progress",
        "Workflow Progress",
        tone="info",
        body="Only safe route labels are shown; raw tool arguments are not exposed.",
        items=[
            {
                "label": f"Step {index + 1}",
                "value": labels.get(event, event.replace("_", " ")),
            }
            for index, event in enumerate(events[:12])
        ],
    )


def _facts_template(snapshot: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    items = [
        {"label": "Location", "value": snapshot.get("location_text") or "Needed"},
        {"label": "Needs", "value": ", ".join(snapshot.get("needs") or []) or "Needed"},
        {
            "label": "Household",
            "value": str(snapshot.get("household_size") or "Needed"),
        },
        {"label": "Housing", "value": snapshot.get("housing_status") or "unknown"},
    ]
    return _template(
        "facts",
        "fact_summary",
        "Conversation Intake",
        tone="info" if patch else "neutral",
        subtitle="Updated from this turn" if patch else "Ready for details",
        items=items,
    )


def _questions_template(questions: list[str]) -> dict[str, Any]:
    return _template(
        "next-questions",
        "question_set",
        "Next Best Questions",
        tone="warning",
        body="Answer only what you are comfortable sharing. Broad ranges are enough.",
        items=[
            {"label": f"Q{index + 1}", "value": question}
            for index, question in enumerate(questions)
        ],
        actions=[
            a2ui_action(
                "open_resources",
                "Review local handoff options",
                target="local-resources",
            )
        ],
    )


def _benefit_paths_template(packet: dict[str, Any]) -> dict[str, Any]:
    items = []
    citations = []
    for path in packet.get("potential_benefit_paths", [])[:4]:
        path_citations = path.get("source_citations", [])[:2]
        citations.extend(path_citations)
        items.append(
            {
                "title": path.get("program_name"),
                "subtitle": str(path.get("status_label", "")).replace("_", " "),
                "body": " ".join(path.get("why_this_is_relevant", [])[:2]),
                "badges": path.get("missing_facts", [])[:2],
                "links": _links_from_citations(path_citations),
            }
        )
    return _template(
        "benefit-paths",
        "benefit_paths",
        "Paths Worth Checking",
        tone="success",
        body="These are preparation directions, not eligibility decisions.",
        items=items,
        actions=[a2ui_action("open_packet", "Open packet", target="packet-summary")],
        citations=citations,
    )


def _resources_template(resources: list[dict[str, Any]]) -> dict[str, Any]:
    if not resources:
        return _template(
            "local-resources",
            "local_resources",
            "Local Handoffs",
            tone="warning",
            body="No local handoff matched yet. Try county-level wording such as Santa Clara County or San Francisco.",
            items=[],
            actions=[
                a2ui_action(
                    "open_resources", "Open resources", target="local-resources"
                )
            ],
        )
    return _template(
        "local-resources",
        "local_resources",
        "Local Handoffs",
        tone="accent",
        body="Local details can change. Call before going to confirm current availability.",
        items=[
            {
                "title": resource.get("organization"),
                "subtitle": resource.get("service_name"),
                "body": resource.get("availability_notice", "Call before going."),
                "badges": [
                    value
                    for value in (resource.get("phone"), resource.get("service_type"))
                    if value
                ],
                "links": [{"label": "Open source", "href": resource["url"]}]
                if resource.get("url")
                else [],
            }
            for resource in resources
        ],
        actions=[
            a2ui_action("open_resources", "Open resources", target="local-resources")
        ],
    )


def _source_links_template(packet: dict[str, Any]) -> dict[str, Any]:
    citations = _dedupe_citations(
        list(packet.get("source_citations", []))
        + [
            citation
            for path in packet.get("potential_benefit_paths", [])
            for citation in path.get("source_citations", [])
        ]
    )[:8]
    return _template(
        "source-links",
        "source_links",
        "Official Source Links",
        tone="source",
        body="Use these official or approved sources for next steps.",
        items=[
            {
                "title": citation.get("source_title") or citation.get("source_id"),
                "subtitle": citation.get("freshness_state", "current"),
                "links": [{"label": "Open", "href": citation.get("url", "")}],
            }
            for citation in citations
        ],
        actions=[
            a2ui_action("open_sources", "Open source sheet", target="source-sheet")
        ],
        citations=citations,
    )


def _packet_summary_template(packet: dict[str, Any]) -> dict[str, Any]:
    return _template(
        "packet-summary",
        "packet_summary",
        "Prep Packet Summary",
        tone="info",
        body=packet.get("household_snapshot_summary"),
        items=[
            {"title": "Documents", "badges": packet.get("document_checklist", [])[:4]},
            {
                "title": "Questions",
                "badges": packet.get("caseworker_questions", [])[:3],
            },
            {"title": "Call script", "body": packet.get("call_script", "")},
        ],
        actions=[
            a2ui_action("open_packet", "Open packet", target="packet-summary"),
            a2ui_action("copy_call_script", "Copy call script", target="call-script"),
            a2ui_action(
                "download_markdown", "Download Markdown", target="document-kit"
            ),
            a2ui_action("download_calendar", "Add reminders", target="document-kit"),
        ],
    )


def _document_kit_templates(
    packet: dict[str, Any], resources: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Build stable A2UI document templates for the Document Studio."""

    citations = _dedupe_packet_citations(packet)
    local_items = _local_handoff_items(resources)
    return [
        _template(
            "document-kit",
            "document_kit",
            "Prep Document Kit",
            tone="success",
            subtitle="Built from conversation facts, official sources, and local handoffs.",
            body=(
                "Use these preparation documents for an agency conversation. "
                "Official agencies decide eligibility and amounts."
            ),
            items=[
                {"label": "Summary", "value": "One-page situation summary"},
                {"label": "Checklist", "value": "Documents and facts to gather"},
                {"label": "Questions", "value": "Questions to ask a caseworker"},
                {"label": "Call script", "value": "Plain-language call opener"},
                {"label": "Handoffs", "value": "Local resources to call before going"},
                {"label": "Sources", "value": "Official source sheet"},
            ],
            actions=[
                a2ui_action("open_packet", "Open packet", target="document-kit"),
                a2ui_action("open_sources", "Open sources", target="source-sheet"),
            ],
            citations=citations[:4],
        ),
        _template(
            "document-summary",
            "document_summary",
            "One-Page Summary",
            tone="info",
            body=packet.get("household_snapshot_summary"),
            items=[
                {
                    "title": path.get("program_name", "Benefit path"),
                    "subtitle": str(path.get("status_label", "")).replace("_", " "),
                    "body": " ".join(path.get("why_this_is_relevant", [])[:2]),
                }
                for path in packet.get("potential_benefit_paths", [])[:4]
            ],
            citations=citations[:4],
        ),
        _template(
            "document-checklist",
            "document_checklist",
            "Documents To Bring",
            tone="accent",
            body="Gather only documents you already have or can safely access.",
            items=[
                {"label": f"Item {index + 1}", "value": item}
                for index, item in enumerate(packet.get("document_checklist", [])[:10])
            ],
        ),
        _template(
            "caseworker-questions",
            "caseworker_questions",
            "Questions To Ask",
            tone="warning",
            body="Use these as prompts during a call or appointment.",
            items=[
                {"label": f"Q{index + 1}", "value": question}
                for index, question in enumerate(
                    packet.get("caseworker_questions", [])[:8]
                )
            ],
        ),
        _template(
            "call-script",
            "call_script",
            "Call Script",
            tone="neutral",
            body=packet.get("call_script", ""),
            items=[
                {"label": "Reminder", "value": "Call before going."},
                {
                    "label": "Boundary",
                    "value": "AidAtlasCA does not submit applications.",
                },
            ],
            actions=[
                a2ui_action(
                    "copy_call_script", "Copy call script", target="call-script"
                )
            ],
        ),
        _template(
            "local-handoff-sheet",
            "local_handoff_sheet",
            "Local Handoff Sheet",
            tone="accent" if local_items else "warning",
            body="Local details can change. Call before going to confirm current availability.",
            items=local_items,
            actions=[
                a2ui_action(
                    "open_resources", "Open resources", target="local-handoff-sheet"
                )
            ],
        ),
        _template(
            "source-sheet",
            "source_sheet",
            "Official Source Sheet",
            tone="source",
            body="Use these official or approved sources to verify next steps.",
            items=[
                {
                    "title": citation.get("source_title") or citation.get("source_id"),
                    "subtitle": citation.get("agency_owner")
                    or citation.get("source_type")
                    or citation.get("freshness_state", "source"),
                    "links": [{"label": "Open source", "href": citation.get("url", "")}]
                    if citation.get("url")
                    else [],
                }
                for citation in citations[:10]
            ],
            actions=[
                a2ui_action(
                    "open_resource_url",
                    citation.get("source_title")
                    or citation.get("source_id")
                    or "Open source",
                    href=citation.get("url"),
                )
                for citation in citations[:4]
                if citation.get("url")
            ],
            citations=citations[:10],
        ),
    ]


def _local_handoff_items(resources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items = []
    for resource in resources[:6]:
        badges = [
            value
            for value in (
                resource.get("service_type"),
                resource.get("jurisdiction"),
                resource.get("phone"),
            )
            if value
        ]
        links = []
        if resource.get("url"):
            links.append({"label": "Open resource", "href": resource["url"]})
        if resource.get("maps_url"):
            links.append({"label": "Open map", "href": resource["maps_url"]})
        items.append(
            {
                "title": resource.get("organization"),
                "subtitle": resource.get("service_name"),
                "body": resource.get("availability_notice", "Call before going."),
                "badges": badges,
                "links": links,
            }
        )
    return items


def _dedupe_packet_citations(packet: dict[str, Any]) -> list[dict[str, Any]]:
    return _dedupe_citations(
        list(packet.get("source_citations", []))
        + [
            citation
            for path in packet.get("potential_benefit_paths", [])
            for citation in path.get("source_citations", [])
        ]
    )


def _privacy_template(findings: list[str]) -> dict[str, Any]:
    return _template(
        "privacy-block",
        "privacy_notice",
        "Sensitive Details Blocked",
        tone="danger",
        body="AidAtlasCA does not need SSNs, credentials, case numbers, cards, real documents, or exact addresses.",
        items=[
            {"label": "Detected", "value": ", ".join(findings) or "sensitive detail"}
        ],
    )


def _safety_template(route: str) -> dict[str, Any]:
    source_ids = (
        ["988_lifeline", "samhsa_national_helpline"]
        if route == "crisis_handoff"
        else ["national_domestic_violence_hotline"]
    )
    citations = [
        DEFAULT_STORE.citation(source_id).to_dict()
        for source_id in source_ids
        if source_id in DEFAULT_STORE.approved_sources_by_id
    ]
    return _template(
        "safety-handoff",
        "safety_handoff",
        "Safety Handoff",
        tone="danger",
        body=fixed_handoff_text(route),
        actions=[
            a2ui_action(
                "open_resource_url",
                citation.get("source_title")
                or citation.get("source_id")
                or "Open source",
                href=citation.get("url"),
            )
            for citation in citations
            if citation.get("url")
        ],
        citations=citations,
    )


def _route_template(graph_result: dict[str, Any]) -> dict[str, Any]:
    return _template(
        "route-status",
        "route_status",
        "Conversation Route",
        tone="warning",
        body=graph_result.get("message")
        or "This request needs a safer or supported route.",
        items=[{"label": "Route", "value": graph_result.get("route", "unknown")}],
    )


def _links_from_citations(citations: list[dict[str, Any]]) -> list[dict[str, str]]:
    links = []
    for citation in citations:
        url = citation.get("url")
        if url:
            links.append(
                {
                    "label": citation.get("source_title")
                    or citation.get("source_id")
                    or "Source",
                    "href": url,
                }
            )
    return links


def _dedupe_citations(citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped = []
    for citation in citations:
        key = citation.get("source_id") or citation.get("url")
        if key and key not in seen:
            seen.add(key)
            deduped.append(citation)
    return deduped
