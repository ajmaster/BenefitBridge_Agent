"""Benefit prep matching tools."""

from __future__ import annotations

from typing import Any

from app.schemas import BenefitPath, HouseholdSnapshot, ToolError
from app.services.source_store import DEFAULT_STORE

NEED_TO_PROGRAMS = {
    "food": ["food_calfresh"],
    "food today": ["food_calfresh"],
    "wic": ["food_wic"],
    "health": ["health_medi_cal_chip_marketplace"],
    "health coverage": ["health_medi_cal_chip_marketplace"],
    "utilities": ["utilities_liheap_lifeline"],
    "utility": ["utilities_liheap_lifeline"],
    "housing": ["housing_homelessness"],
    "shelter": ["housing_homelessness"],
    "cash": ["cash_family_adult_assistance"],
    "local help": ["housing_homelessness"],
}


def get_benefit_program_area(program_area_id: str) -> dict[str, object]:
    """Return deterministic prep/handoff logic for a BenefitBridge program area."""

    if program_area_id not in DEFAULT_STORE.program_areas_by_id:
        return ToolError(
            code="PROGRAM_AREA_UNKNOWN",
            message=f"Unknown program area: {program_area_id}",
            blocking=True,
        ).to_dict()
    return DEFAULT_STORE.program_area(program_area_id).to_dict()


def _snapshot_from_input(value: dict[str, Any]) -> HouseholdSnapshot:
    return HouseholdSnapshot(
        language=value.get("language", "en"),
        location=value.get("location", {}),
        household_size=value.get("household_size"),
        adults=value.get("adults"),
        children_ages=value.get("children_ages", []),
        needs=value.get("needs", []),
        income_range_monthly=value.get("income_range_monthly"),
        housing_status=value.get("housing_status", "unknown"),
        utilities_need=bool(value.get("utilities_need", False)),
        food_need_today=bool(value.get("food_need_today", False)),
        pii_collected=bool(value.get("pii_collected", False)),
        urgent_need=bool(value.get("urgent_need", False)),
        safety_sensitive=bool(value.get("safety_sensitive", False)),
    )


def _program_ids_for_snapshot(snapshot: HouseholdSnapshot) -> list[str]:
    ids: list[str] = []
    joined_needs = " ".join(snapshot.needs).lower()
    for need, program_ids in NEED_TO_PROGRAMS.items():
        if need in joined_needs:
            ids.extend(program_ids)
    if snapshot.children_ages or "child" in joined_needs or "kids" in joined_needs:
        ids.append("food_wic")
    if snapshot.utilities_need:
        ids.append("utilities_liheap_lifeline")
    if snapshot.food_need_today:
        ids.append("food_calfresh")
    return list(dict.fromkeys(ids))


def match_benefit_paths(
    household_snapshot: dict[str, Any],
    county_profile: dict[str, Any] | None = None,
    benefit_program_areas: list[dict[str, Any]] | None = None,
) -> list[dict[str, object]]:
    """Produce potential benefit paths without determining eligibility."""

    snapshot = _snapshot_from_input(household_snapshot)
    explicit_ids = [
        area.get("program_area_id")
        for area in benefit_program_areas or []
        if area.get("program_area_id")
    ]
    program_ids = explicit_ids or _program_ids_for_snapshot(snapshot)
    paths: list[dict[str, object]] = []

    # Map all source IDs associated with each county profile in the store
    all_county_sources: dict[str, set[str]] = {}
    for p in DEFAULT_STORE.county_profiles:
        profile_id = p["id"]
        sids = set(p.get("source_ids", []))
        if "primary_benefits_office" in p:
            sid = p["primary_benefits_office"].get("source_id")
            if sid:
                sids.add(sid)
        for field in (
            "food_handoff",
            "shelter_handoff",
            "wic_handoff",
            "legal_handoff",
            "service_centers",
        ):
            for item in p.get(field, []) or []:
                if isinstance(item, dict):
                    sid = item.get("source_id")
                    if sid:
                        sids.add(sid)
        all_county_sources[profile_id] = sids

    user_county_id = county_profile.get("id") if county_profile else None
    user_sources = (
        all_county_sources.get(user_county_id, set()) if user_county_id else set()
    )

    for program_id in program_ids:
        if program_id not in DEFAULT_STORE.program_areas_by_id:
            continue
        area = DEFAULT_STORE.program_area(program_id)

        # Filter the program's primary source IDs to exclude sources belonging to other counties
        filtered_source_ids = []
        for source_id in area.primary_source_ids:
            if source_id not in DEFAULT_STORE.approved_sources_by_id:
                continue

            # Check if this source belongs to any other county profile
            belongs_to_other_county = False
            for c_id, c_sids in all_county_sources.items():
                if c_id != user_county_id and source_id in c_sids:
                    belongs_to_other_county = True
                    break

            # If it belongs to another county and not the user's county, skip it
            if belongs_to_other_county and source_id not in user_sources:
                continue

            filtered_source_ids.append(source_id)

        citations = [
            DEFAULT_STORE.citation(source_id) for source_id in filtered_source_ids[:2]
        ]

        # Safe fallback: if filtering removed all citations, fall back to global defaults
        if not citations:
            citations = [
                DEFAULT_STORE.citation(source_id)
                for source_id in area.primary_source_ids[:2]
                if source_id in DEFAULT_STORE.approved_sources_by_id
            ]

        status = "likely_worth_checking"
        missing = list(area.prep_questions[:2])
        warnings = [
            "This benefit area may be worth checking.",
            "The agency or county determines eligibility and benefit amounts.",
        ]
        if program_id == "food_wic" and not snapshot.children_ages:
            status = "needs_more_information"
        if program_id == "housing_homelessness":
            status = "local_handoff_recommended"
            warnings.append("No live shelter or resource availability is claimed.")

        path = BenefitPath(
            area=program_id,
            program_name=area.display_name,
            status_label=status,  # type: ignore[arg-type]
            why_this_is_relevant=[
                "The household needs or situation maps to this prep area.",
                "This is a prep suggestion, not an eligibility decision.",
            ],
            missing_facts=missing,
            documents_to_prepare=area.documents_to_prepare[:5],
            source_citations=citations,
            warnings=warnings,
            official_links=[citation.url for citation in citations],
            agency_contacts=_county_contacts(county_profile),
        )
        paths.append(path.to_dict())
    return paths


def _county_contacts(profile: dict[str, Any] | None) -> list[str]:
    if not profile:
        return []
    office = profile.get("primary_benefits_office") or {}
    contacts = []
    if office.get("organization") and office.get("phone"):
        contacts.append(f"{office['organization']}: {office['phone']}")
    return contacts
