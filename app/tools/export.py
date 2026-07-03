"""Session-only prep packet export helpers."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.tools.validation import validate_packet

_MAPS_EXPORT_NOTICE = "Google Places details may change. Call before going."


def export_packet(
    packet: dict[str, Any],
    formats: list[str] | None = None,
    resources: list[dict[str, Any]] | None = None,
) -> dict[str, object]:
    """Export packet artifacts without submitting applications or storing PII."""

    formats = formats or ["html", "json", "md"]
    safe_resources = _safe_resources_for_export(resources or [])
    validation = validate_packet(packet)
    if not validation["pass"]:
        return {
            "error": {
                "code": "SAFETY_BLOCK",
                "message": "Packet failed validation and cannot be exported.",
                "blocking_failures": validation["blocking_failures"],
            }
        }

    artifacts = []
    if "json" in formats:
        json_payload: dict[str, Any] | Any = packet
        if safe_resources:
            json_payload = {"packet": packet, "resources": safe_resources}
        artifacts.append(
            {
                "format": "json",
                "content": json.dumps(json_payload, indent=2, sort_keys=True),
                "storage": "session_only",
            }
        )
    if "md" in formats:
        artifacts.append(
            {
                "format": "md",
                "content": _packet_markdown(packet, safe_resources),
                "storage": "session_only",
            }
        )
    if "html" in formats:
        artifacts.append(
            {
                "format": "html",
                "content": (
                    f"<main><pre>{_escape(_packet_markdown(packet, safe_resources))}"
                    "</pre></main>"
                ),
                "storage": "session_only",
            }
        )
    if "pdf" in formats:
        artifacts.append(
            {
                "format": "pdf",
                "content": "PDF export placeholder; render from printable HTML in implementation.",
                "storage": "session_only",
            }
        )
    if "ics" in formats:
        artifacts.append(
            {
                "format": "ics",
                "content": _packet_ics(packet),
                "storage": "session_only",
            }
        )

    return {
        "artifacts": artifacts,
        "source_citations_json": packet.get("source_citations", []),
        "validation": validation,
    }


def _packet_markdown(
    packet: dict[str, Any], resources: list[dict[str, Any]] | None = None
) -> str:
    lines = [
        "# AidAtlasCA Prep Documents",
        "",
        packet.get("safety_notice", ""),
        "",
        "## Household Snapshot",
        packet.get("household_snapshot_summary", ""),
        "",
        "## One-Page Summary",
        "These notes are preparation materials only. Official agencies decide eligibility and amounts.",
        "",
        "## Potential Benefit Paths",
    ]
    for path in packet.get("potential_benefit_paths", []):
        lines.extend(
            [
                f"### {path.get('program_name', 'Benefit path')}",
                f"Status: {path.get('status_label', 'unknown')}",
                "",
            ]
        )
        _append_list(
            lines, "Why this may be relevant", path.get("why_this_is_relevant", [])
        )
        _append_list(lines, "Missing facts", path.get("missing_facts", []))
        _append_list(
            lines, "Documents to prepare", path.get("documents_to_prepare", [])
        )
        _append_list(lines, "Warnings", path.get("warnings", []))
        _append_list(lines, "Official links", path.get("official_links", []))
    _append_list(lines, "## Documents To Bring", packet.get("document_checklist", []))
    _append_list(lines, "## Questions To Ask", packet.get("caseworker_questions", []))
    lines.extend(["", "## Call Script", packet.get("call_script", ""), ""])
    _append_list(
        lines, "## Immediate Help Notes", packet.get("immediate_help_notes", [])
    )
    if resources:
        lines.extend(_resource_markdown(resources))
    lines.extend(_source_markdown(packet))
    return "\n".join(lines)


def _append_list(lines: list[str], title: str, items: list[Any]) -> None:
    if not items:
        return
    lines.extend(["", title])
    for item in items:
        lines.append(f"- {item}")
    lines.append("")


def _safe_resources_for_export(
    resources: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    allowed = {
        "id",
        "organization",
        "service_name",
        "service_type",
        "jurisdiction",
        "phone",
        "url",
        "address",
        "languages",
        "call_before_going",
        "availability_notice",
        "maps_enrichment",
    }
    safe_resources = []
    for resource in resources:
        safe = {
            key: value
            for key, value in resource.items()
            if key in allowed and value not in (None, "")
        }
        enrichment = safe.get("maps_enrichment")
        if isinstance(enrichment, dict):
            safe["maps_enrichment"] = _safe_maps_enrichment(enrichment)
        safe_resources.append(safe)
    return safe_resources


def _safe_maps_enrichment(enrichment: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "provider",
        "display_name",
        "national_phone_number",
        "google_maps_uri",
        "website_uri",
        "rating",
        "availability_notice",
    }
    return {
        key: value
        for key, value in enrichment.items()
        if key in allowed and value not in (None, "")
    }


def _resource_markdown(resources: list[dict[str, Any]]) -> list[str]:
    lines = [
        "",
        "## Local Handoffs",
        "Call before going to confirm current availability.",
        "",
    ]
    for resource in resources:
        lines.extend(
            [
                f"### {resource.get('organization', 'Local resource')}",
                str(resource.get("service_name", "")),
                f"Area: {resource.get('jurisdiction', 'unknown')}",
            ]
        )
        if resource.get("phone"):
            lines.append(f"Phone: {resource['phone']}")
        if resource.get("url"):
            lines.append(f"Resource link: {resource['url']}")
        enrichment = resource.get("maps_enrichment")
        if isinstance(enrichment, dict) and enrichment:
            lines.extend(_maps_enrichment_markdown(enrichment))
        lines.append("")
    return lines


def _source_markdown(packet: dict[str, Any]) -> list[str]:
    citations = _dedupe_citations(
        list(packet.get("source_citations", []))
        + [
            citation
            for path in packet.get("potential_benefit_paths", [])
            for citation in path.get("source_citations", [])
        ]
    )
    if not citations:
        return []
    lines = ["", "## Official Source Sheet", ""]
    for citation in citations:
        title = citation.get("source_title") or citation.get("source_id") or "Source"
        lines.append(f"- {title}")
        if citation.get("agency_owner"):
            lines.append(f"  - Agency: {citation['agency_owner']}")
        if citation.get("freshness_state"):
            lines.append(f"  - Freshness: {citation['freshness_state']}")
        if citation.get("url"):
            lines.append(f"  - Link: {citation['url']}")
    return lines


def _dedupe_citations(citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped = []
    for citation in citations:
        key = citation.get("source_id") or citation.get("url")
        if key and key not in seen:
            seen.add(key)
            deduped.append(citation)
    return deduped


def _maps_enrichment_markdown(enrichment: dict[str, Any]) -> list[str]:
    lines = ["Google Maps contact/location detail:"]
    if enrichment.get("national_phone_number"):
        lines.append(f"Google phone: {enrichment['national_phone_number']}")
    if enrichment.get("google_maps_uri"):
        lines.append(f"Google Maps link: {enrichment['google_maps_uri']}")
    if enrichment.get("website_uri"):
        lines.append(f"Website from Google: {enrichment['website_uri']}")
    if enrichment.get("rating"):
        lines.append(f"Google user rating: {enrichment['rating']}")
    lines.append(str(enrichment.get("availability_notice") or _MAPS_EXPORT_NOTICE))
    return lines


def _escape(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _packet_ics(packet: dict[str, Any]) -> str:
    """Build a minimal RFC 5545 calendar with one reminder event per benefit path.

    Events are self-reminders only (e.g. "call before going", "gather documents").
    No live appointment availability or application submission is implied.
    """

    now = datetime.now(UTC)
    reminder_start = now + timedelta(days=1)

    events = [
        _ics_event(
            reminder_start, "AidAtlasCA prep reminder", packet.get("call_script", "")
        )
    ]
    for offset, path in enumerate(packet.get("potential_benefit_paths", []), start=1):
        program_name = path.get("program_name", "Benefit path")
        description_lines = ["Missing facts:", *path.get("missing_facts", [])]
        description_lines.extend(
            ["Documents to prepare:", *path.get("documents_to_prepare", [])]
        )
        events.append(
            _ics_event(
                reminder_start + timedelta(hours=offset),
                f"Prepare: {program_name}",
                "\n".join(description_lines),
            )
        )

    return "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AidAtlasCA//Prep Reminders//EN",
            *[line for event in events for line in event],
            "END:VCALENDAR",
        ]
    )


def _ics_event(start: datetime, summary: str, description: str) -> list[str]:
    stamp = start.strftime("%Y%m%dT%H%M%SZ")
    return [
        "BEGIN:VEVENT",
        f"UID:{uuid.uuid4()}@aidatlasca",
        f"DTSTAMP:{stamp}",
        f"DTSTART:{stamp}",
        f"SUMMARY:{_ics_escape(summary)}",
        f"DESCRIPTION:{_ics_escape(description)}",
        "END:VEVENT",
    ]


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )
