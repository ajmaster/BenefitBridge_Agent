"""Local handoff resource tools."""

from __future__ import annotations

from urllib.parse import quote_plus

from app.services.google_integrations import maps_place_enrichment
from app.services.source_store import DEFAULT_STORE

STATEWIDE_LOCATOR_NOTICE = "Call before going to confirm current availability."

_STATEWIDE_LOCATOR_SOURCE_IDS_BY_NEED = {
    "benefits_office": ["cdss_county_offices", "benefitscal_info", "ca_211_home"],
    "cash_assistance": ["cdss_county_offices", "benefitscal_info", "ca_211_home"],
    "food": ["cdss_food_banks", "cafoodbanks_members", "ca_211_home"],
    "health": ["dhcs_county_offices", "dhcs_medi_cal_apply", "covered_ca_get_started"],
    "housing": ["ca_211_home", "hud_housing_counselor_api"],
    "shelter": ["ca_211_home", "hud_housing_counselor_api"],
    "utility": ["csd_liheap_program", "caliheapapply_home", "ca_211_home"],
    "wic": ["cdph_wic_office_grocer_locator", "cdph_wic_home", "ca_211_home"],
}


def find_local_resources(
    jurisdiction: str,
    need_type: str,
    radius: int | None = None,
    language: str | None = None,
    safety_sensitive: bool = False,
) -> list[dict[str, object]]:
    """Return curated local resources with call-before-going semantics."""

    resources = DEFAULT_STORE.local_resource_results(jurisdiction, need_type)
    routed_jurisdiction = _resource_jurisdiction(jurisdiction)
    if not resources and routed_jurisdiction != jurisdiction:
        resources = DEFAULT_STORE.local_resource_results(routed_jurisdiction, need_type)

    results = [resource.to_dict() for resource in resources]
    if not results:
        results = _statewide_locator_resources(routed_jurisdiction, need_type)

    for result in results:
        result["radius"] = radius
        result["requested_language"] = language
        result["availability_notice"] = result.get("availability_notice") or (
            "Local resource details can change. Call before going."
        )
        if result.get("coverage_level") == "statewide_locator":
            continue

        map_query = _safe_map_query(result)
        result["map_query"] = map_query
        result["maps_url"] = (
            f"https://www.google.com/maps/search/?api=1&query={quote_plus(map_query)}"
        )
        if not safety_sensitive:
            enrichment = maps_place_enrichment(
                query=map_query,
                jurisdiction=str(result.get("jurisdiction") or routed_jurisdiction),
                language=language or "en",
            )
            if enrichment.get("provider") == "google_places" and enrichment.get("live"):
                result["maps_enrichment"] = enrichment
    return results


def _resource_jurisdiction(jurisdiction: str) -> str:
    """Map city/ZIP-style public geography to curated county resource buckets."""

    lowered = jurisdiction.lower()
    for profile in DEFAULT_STORE.county_profiles:
        profile_name = str(profile.get("name", ""))
        cities = [str(city).lower() for city in profile.get("cities_in_scope", [])]
        if profile_name.lower() in lowered or any(city in lowered for city in cities):
            if profile.get("county_id"):
                county = next(
                    (
                        county_profile
                        for county_profile in DEFAULT_STORE.county_profiles
                        if county_profile.get("id") == profile["county_id"]
                    ),
                    None,
                )
                if county:
                    return str(county.get("name", jurisdiction))
            return profile_name or jurisdiction
    return jurisdiction


def _safe_map_query(resource: dict[str, object]) -> str:
    """Build a Maps query from curated display fields, not user origin text."""

    organization = str(resource.get("organization") or "").strip()
    jurisdiction = str(resource.get("jurisdiction") or "").strip()
    service_name = str(resource.get("service_name") or "").strip()
    parts = [part for part in (organization, service_name, jurisdiction) if part]
    return " ".join(parts)


def _statewide_locator_resources(
    jurisdiction: str, need_type: str | None
) -> list[dict[str, object]]:
    profile = DEFAULT_STORE.county_profile(jurisdiction)
    county = (
        str(profile.get("county_name") or profile.get("name"))
        if profile
        else jurisdiction
    )
    if not profile or profile.get("coverage_level") != "statewide_core":
        return []

    resources = []
    for source_id in _locator_source_ids(need_type):
        if source_id not in DEFAULT_STORE.approved_sources_by_id:
            continue
        source = DEFAULT_STORE.source_metadata(source_id)
        citation = DEFAULT_STORE.citation(
            source_id, snippet=_locator_snippet(source_id, need_type)
        ).to_dict()
        resources.append(
            {
                "id": f"statewide_locator_{_slug(county)}_{source_id}",
                "organization": source["name"],
                "service_name": _locator_service_name(source_id, need_type),
                "service_type": _normalized_need_type(need_type),
                "jurisdiction": county,
                "phone": "211" if source_id == "ca_211_home" else None,
                "url": source.get("url"),
                "address": None,
                "hours": None,
                "languages": [],
                "eligibility_notes": (
                    "Statewide locator handoff; local resource records are not fully curated for this county."
                ),
                "call_before_going": True,
                "coverage_level": "statewide_locator",
                "coverage_label": "Statewide locator handoff",
                "availability_notice": STATEWIDE_LOCATOR_NOTICE,
                "source_citations": [citation],
            }
        )
    return resources


def _locator_source_ids(need_type: str | None) -> list[str]:
    normalized = _normalized_need_type(need_type)
    return _STATEWIDE_LOCATOR_SOURCE_IDS_BY_NEED.get(
        normalized, _STATEWIDE_LOCATOR_SOURCE_IDS_BY_NEED["benefits_office"]
    )


def _normalized_need_type(need_type: str | None) -> str:
    lowered = (need_type or "").lower()
    if "food" in lowered:
        return "food"
    if "shelter" in lowered:
        return "shelter"
    if "housing" in lowered:
        return "housing"
    if "wic" in lowered:
        return "wic"
    if "health" in lowered or "medi" in lowered:
        return "health"
    if "utility" in lowered or "liheap" in lowered or "energy" in lowered:
        return "utility"
    if "cash" in lowered:
        return "cash_assistance"
    return "benefits_office"


def _locator_service_name(source_id: str, need_type: str | None) -> str:
    normalized = _normalized_need_type(need_type)
    labels = {
        "benefits_office": "County benefits office locator",
        "cash_assistance": "County cash-aid and benefits office locator",
        "food": "Food resource locator",
        "health": "Health coverage office locator",
        "housing": "Housing resource locator",
        "shelter": "Shelter and housing resource navigation",
        "utility": "Utility assistance locator",
        "wic": "WIC office and grocer locator",
    }
    if source_id == "ca_211_home":
        return "211 California resource navigation"
    return labels.get(normalized, "Statewide resource locator")


def _locator_snippet(source_id: str, need_type: str | None) -> str:
    if source_id == "ca_211_home":
        return "Use 211 California for statewide resource navigation; call before going to confirm current availability."
    if source_id == "cdss_food_banks":
        return "Use this official statewide food bank list as a locator handoff; local availability must be confirmed."
    if source_id == "cafoodbanks_members":
        return "Use this statewide food-bank member directory as a handoff, not a live availability source."
    if source_id == "cdph_wic_office_grocer_locator":
        return "Use this official California WIC locator for current office or grocer lookup."
    if source_id in {"dhcs_county_offices", "cdss_county_offices"}:
        return "Use this official statewide county office directory for current county contact routing."
    if source_id == "hud_housing_counselor_api":
        return "Use HUD's housing counselor search as a referral locator, not an eligibility decision source."
    return f"Use this approved statewide {_normalized_need_type(need_type)} locator as a handoff."


def _slug(value: str) -> str:
    return "_".join(value.lower().replace("/", " ").replace(",", " ").split())
