"""Jurisdiction lookup tools."""

from __future__ import annotations

from app.policies.geography import classify_geocoded_location, classify_location
from app.policies.privacy import has_exact_address
from app.schemas import Jurisdiction, ToolError
from app.services.google_integrations import maps_geocode_location


def lookup_county_from_location(
    location_text: str,
    granularity_preference: str = "county",
    user_consented_exact_address: bool = False,
) -> dict[str, object]:
    """Map ZIP/city/county text to state, county, city, and FIPS hints.

    Exact street addresses are blocked by default. They are not needed for
    benefits prep and must never be stored.
    """

    if has_exact_address(location_text) and not user_consented_exact_address:
        return ToolError(
            code="EXACT_ADDRESS_BLOCKED",
            message="Use ZIP, city, or county for benefits prep.",
            blocking=True,
        ).to_dict()

    geocode = maps_geocode_location(location_text)
    decision = classify_geocoded_location(geocode) or classify_location(location_text)
    if not decision.in_pilot and decision.scope_note == "outside_california":
        return {
            "error": ToolError(
                code="OUT_OF_SCOPE_GEOGRAPHY",
                message="AidAtlasCA only supports California prep flows.",
                blocking=False,
            ).to_dict(),
            "jurisdiction": decision.to_dict(),
        }
    if decision.scope_note == "not_enough_location_information":
        return {
            "error": ToolError(
                code="NOT_ENOUGH_LOCATION_INFORMATION",
                message=(
                    "Use a California county, city, or ZIP for benefits prep; "
                    "generic California or Bay Area is too broad for local routing."
                ),
                blocking=True,
            ).to_dict(),
            "jurisdiction": decision.to_dict(),
        }

    jurisdiction = Jurisdiction(
        state=decision.state,
        county=decision.county,
        city=decision.city,
        zip_code=decision.zip_code,
        fips=decision.fips,
        confidence=decision.confidence,
    )
    result = jurisdiction.to_dict()
    result["granularity_preference"] = granularity_preference
    result["scope_note"] = decision.scope_note
    result["in_pilot"] = decision.in_pilot
    result["coverage_level"] = decision.coverage_level
    if geocode.get("specific_location_discarded"):
        result["specific_location_discarded"] = True
    return result
