"""Deterministic BenefitBridge graph pipeline.

This is the scaffolded graph spine that the ADK agent and tests can call. It
keeps high-stakes policy and source handling outside free-form model output.
"""

from __future__ import annotations

from typing import Any

from app.policies.privacy import redact_pii
from app.policies.safety import detect_safety_route, fixed_handoff_text
from app.schemas import BenefitPath, HouseholdSnapshot, SourceCitation
from app.services.packet_builder import build_prep_packet
from app.tools.benefits import match_benefit_paths
from app.tools.jurisdiction import lookup_county_from_location
from app.tools.sources import get_county_profile
from app.tools.validation import validate_packet


def run_benefitbridge_graph(user_text: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    """Run the planned graph order over a synthetic/privacy-preserving snapshot."""

    events: list[str] = []

    events.append("consent_privacy")
    redaction = redact_pii(user_text, context="standard")
    if redaction.blocked:
        return {
            "route": "privacy_block",
            "redaction": redaction.to_dict(),
            "events": events,
            "message": "Sensitive values were redacted. Do not upload SSNs or credentials.",
        }

    events.append("language")
    language = snapshot.get("language", "en")

    events.append("safety_triage")
    safety = detect_safety_route(redaction.redacted_text)
    if safety.suppress_normal_packet:
        return {
            "route": safety.route,
            "safety": safety.to_dict(),
            "message": fixed_handoff_text(safety.route),
            "events": events,
        }

    events.append("jurisdiction")
    location_text = snapshot.get("location_text") or snapshot.get("location") or ""
    jurisdiction = lookup_county_from_location(str(location_text))
    if jurisdiction.get("error") and jurisdiction["error"].get("blocking"):
        return {
            "route": "jurisdiction_block",
            "jurisdiction": jurisdiction,
            "events": events,
        }

    location = _location_for_snapshot(jurisdiction)
    county_name = location.get("county") or location.get("city") or str(location_text)

    events.append("household_snapshot")
    household = HouseholdSnapshot(
        language=language,
        location=location,
        household_size=snapshot.get("household_size"),
        adults=snapshot.get("adults"),
        children_ages=snapshot.get("children_ages", []),
        needs=snapshot.get("needs", []),
        income_range_monthly=snapshot.get("income_range_monthly"),
        housing_status=snapshot.get("housing_status", "unknown"),
        utilities_need=bool(snapshot.get("utilities_need", False)),
        food_need_today=bool(snapshot.get("food_need_today", False)),
        urgent_need=safety.route == "urgent_handoff",
    )

    events.append("needs_classifier")
    events.append("official_source_retrieval")
    county_profile = get_county_profile(str(county_name))
    if "error" in county_profile:
        county_profile = {}

    events.append("benefit_path_matcher")
    raw_paths = match_benefit_paths(household.to_dict(), county_profile)
    paths = [_benefit_path_from_dict(path) for path in raw_paths]

    events.append("missing_facts")
    events.append("document_checklist")
    events.append("agency_contact")
    immediate_notes = (
        [fixed_handoff_text("urgent_handoff")]
        if safety.route == "urgent_handoff"
        else []
    )
    packet = build_prep_packet(household, paths, immediate_help_notes=immediate_notes)

    events.append("safety_and_grounding_critic")
    validation = validate_packet(packet.to_dict())

    events.append("translation")
    events.append("export_prep_packet")
    events.append("eval_telemetry")

    return {
        "route": "standard_benefits_prep",
        "safety": safety.to_dict(),
        "jurisdiction": jurisdiction,
        "packet": packet.to_dict(),
        "validation": validation,
        "events": events,
    }


def _location_for_snapshot(jurisdiction: dict[str, Any]) -> dict[str, Any]:
    if "jurisdiction" in jurisdiction:
        return jurisdiction["jurisdiction"]
    return {
        "city": jurisdiction.get("city"),
        "county": jurisdiction.get("county"),
        "state": jurisdiction.get("state"),
        "zip_code": jurisdiction.get("zip_code"),
        "fips": jurisdiction.get("fips"),
    }


def _benefit_path_from_dict(value: dict[str, Any]) -> BenefitPath:
    citations = [
        SourceCitation(**citation) for citation in value.get("source_citations", [])
    ]
    return BenefitPath(
        area=value["area"],
        program_name=value["program_name"],
        status_label=value["status_label"],
        why_this_is_relevant=value.get("why_this_is_relevant", []),
        missing_facts=value.get("missing_facts", []),
        documents_to_prepare=value.get("documents_to_prepare", []),
        source_citations=citations,
        warnings=value.get("warnings", []),
        official_links=value.get("official_links", []),
        agency_contacts=value.get("agency_contacts", []),
    )
