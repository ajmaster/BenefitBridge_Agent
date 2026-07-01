"""Optional no-key public API tool boundaries."""

from __future__ import annotations

from app.services.api_clients import ensure_live_api_enabled


def get_healthcare_gov_content(
    slug_or_query: str, lang: str = "en"
) -> dict[str, object]:
    """Boundary for HealthCare.gov public content API.

    Runtime packet generation stays fixture-backed unless live APIs are enabled
    for explicit refresh/smoke workflows.
    """

    disabled = ensure_live_api_enabled("healthcare.gov")
    if disabled:
        return disabled
    return {
        "status": "not_implemented_refresh_only",
        "slug_or_query": slug_or_query,
        "lang": lang,
    }


def search_hud_housing_counselors(
    city: str | None = None,
    state: str = "CA",
    lat: float | None = None,
    long: float | None = None,
    distance: int | None = None,
) -> dict[str, object]:
    """Boundary for HUD housing counselor query tool."""

    disabled = ensure_live_api_enabled("hud_housing_counselor")
    if disabled:
        return disabled
    return {
        "status": "not_implemented_refresh_only",
        "city": city,
        "state": state,
        "lat": lat,
        "long": long,
        "distance": distance,
    }


def query_datasf_socrata(
    dataset_id: str | None = None,
    discovery_query: str | None = None,
    limit: int = 5,
) -> dict[str, object]:
    """Boundary for DataSF/Socrata discovery and refresh helpers."""

    disabled = ensure_live_api_enabled("datasf_socrata")
    if disabled:
        return disabled
    return {
        "status": "not_implemented_refresh_only",
        "dataset_id": dataset_id,
        "discovery_query": discovery_query,
        "limit": limit,
    }
