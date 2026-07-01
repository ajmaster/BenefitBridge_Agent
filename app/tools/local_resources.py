"""Local handoff resource tools."""

from __future__ import annotations

from urllib.parse import quote_plus

from app.services.source_store import DEFAULT_STORE


def find_local_resources(
    jurisdiction: str,
    need_type: str,
    radius: int | None = None,
    language: str | None = None,
) -> list[dict[str, object]]:
    """Return curated local resources with call-before-going semantics."""

    resources = DEFAULT_STORE.local_resource_results(jurisdiction, need_type)
    routed_jurisdiction = _resource_jurisdiction(jurisdiction)
    if not resources and routed_jurisdiction != jurisdiction:
        resources = DEFAULT_STORE.local_resource_results(routed_jurisdiction, need_type)

    results = [resource.to_dict() for resource in resources]
    for result in results:
        result["radius"] = radius
        result["requested_language"] = language
        result["availability_notice"] = (
            "Local resource details can change. Call before going."
        )
        map_query = _safe_map_query(result)
        result["map_query"] = map_query
        result["maps_url"] = (
            "https://www.google.com/maps/search/?api=1&query="
            f"{quote_plus(map_query)}"
        )
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
