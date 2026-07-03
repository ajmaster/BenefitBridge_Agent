import pytest

import app.services.google_integrations as google_integrations
from app.services.source_store import DEFAULT_STORE
from app.tools.benefits import match_benefit_paths
from app.tools.jurisdiction import lookup_county_from_location
from app.tools.local_resources import find_local_resources
from app.tools.sources import get_county_profile


class _MapsPlacesProvider:
    def __init__(self) -> None:
        self.queries: list[str] = []
        self.geocode_inputs: list[str] = []

    def enrich_place(
        self, *, query: str, jurisdiction: str | None = None
    ) -> dict[str, object]:
        del jurisdiction
        self.queries.append(query)
        return {
            "place_id": "places/test",
            "display_name": "Curated Resource",
            "formatted_address": "Public service location",
            "national_phone_number": "+1 408-555-0100",
            "website_uri": "https://example.org",
            "google_maps_uri": "https://maps.google.com/?cid=test",
            "open_now": True,
        }

    def geocode_location(self, location_text: str) -> dict[str, object]:
        self.geocode_inputs.append(location_text)
        return {
            "provider": "google_geocoding",
            "status": "OK",
            "types": ["street_address"],
            "state": "CA",
            "county": "Santa Clara County",
            "city": "San Jose",
            "zip_code": "95110",
            "specific_location_discarded": True,
        }


class _OutsidePilotGeocodeProvider(_MapsPlacesProvider):
    def geocode_location(self, location_text: str) -> dict[str, object]:
        self.geocode_inputs.append(location_text)
        return {
            "provider": "google_geocoding",
            "status": "OK",
            "types": ["locality", "political"],
            "state": "CA",
            "county": "Los Angeles County",
            "city": "Los Angeles",
            "zip_code": None,
            "specific_location_discarded": False,
        }


@pytest.fixture(autouse=True)
def reset_google_integration_providers() -> None:
    yield
    google_integrations.reset_integration_providers()


@pytest.mark.parametrize(
    ("location_text", "expected_county", "expected_fips"),
    [
        ("Alameda County", "Alameda County", "06001"),
        ("Oakland, CA", "Alameda County", "06001"),
        ("Contra Costa County", "Contra Costa County", "06013"),
        ("Concord, CA", "Contra Costa County", "06013"),
        ("Marin County", "Marin County", "06041"),
        ("San Rafael, CA", "Marin County", "06041"),
        ("Napa County", "Napa County", "06055"),
        ("Napa, CA", "Napa County", "06055"),
        ("San Francisco County", "San Francisco County", "06075"),
        ("San Francisco, CA", "San Francisco County", "06075"),
        ("San Mateo County", "San Mateo County", "06081"),
        ("Redwood City, CA", "San Mateo County", "06081"),
        ("Santa Clara County", "Santa Clara County", "06085"),
        ("San Jose, CA", "Santa Clara County", "06085"),
        ("Solano County", "Solano County", "06095"),
        ("Vallejo, CA", "Solano County", "06095"),
        ("Sonoma County", "Sonoma County", "06097"),
        ("Santa Rosa, CA", "Sonoma County", "06097"),
    ],
)
def test_location_lookup_supports_nine_bay_area_counties(
    location_text: str, expected_county: str, expected_fips: str
) -> None:
    result = lookup_county_from_location(location_text)

    assert "error" not in result
    assert result["state"] == "CA"
    assert result["county"] == expected_county
    assert result["fips"] == expected_fips
    assert result["in_pilot"] is True


def test_generic_bay_area_requires_more_location_detail() -> None:
    result = lookup_county_from_location("I am somewhere in the Bay Area")

    assert result["error"]["code"] == "NOT_ENOUGH_LOCATION_INFORMATION"
    assert result["error"]["blocking"] is True
    assert result["jurisdiction"]["scope_note"] == "not_enough_location_information"


def test_location_lookup_blocks_exact_address_without_consent() -> None:
    result = lookup_county_from_location("70 W Hedding St, San Jose, CA 95110")

    assert result["code"] == "EXACT_ADDRESS_BLOCKED"
    assert result["blocking"] is True


def test_location_lookup_uses_geocoding_but_discards_exact_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = _MapsPlacesProvider()
    monkeypatch.setenv("ENABLE_GOOGLE_MAPS", "true")
    google_integrations.set_maps_places_provider(provider)

    result = lookup_county_from_location(
        "70 W Hedding St, San Jose, CA 95110",
        user_consented_exact_address=True,
    )

    assert provider.geocode_inputs == ["70 W Hedding St, San Jose, CA 95110"]
    assert result["state"] == "CA"
    assert result["county"] == "Santa Clara County"
    assert result["city"] == "San Jose"
    assert result["zip_code"] == "95110"
    assert result["fips"] == "06085"
    assert result["in_pilot"] is True
    assert result["specific_location_discarded"] is True
    assert "70 W Hedding" not in str(result)


def test_location_lookup_uses_geocoding_for_california_outside_pilot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = _OutsidePilotGeocodeProvider()
    monkeypatch.setenv("ENABLE_GOOGLE_MAPS", "true")
    google_integrations.set_maps_places_provider(provider)

    result = lookup_county_from_location("Los Angeles, CA")

    assert provider.geocode_inputs == ["Los Angeles, CA"]
    assert result["state"] == "CA"
    assert result["county"] == "Los Angeles County"
    assert result["city"] == "Los Angeles"
    assert result["fips"] == "06037"
    assert result["in_pilot"] is False
    assert result["coverage_level"] == "statewide_core"
    assert result["scope_note"] == "statewide_core"


@pytest.mark.parametrize(
    ("location_text", "expected_county", "expected_fips"),
    [
        ("Fresno County", "Fresno County", "06019"),
        ("Los Angeles County", "Los Angeles County", "06037"),
        ("San Diego County", "San Diego County", "06073"),
        ("Humboldt County", "Humboldt County", "06023"),
        ("Sacramento, CA", "Sacramento County", "06067"),
    ],
)
def test_location_lookup_supports_statewide_core_counties(
    location_text: str, expected_county: str, expected_fips: str
) -> None:
    result = lookup_county_from_location(location_text)

    assert "error" not in result
    assert result["state"] == "CA"
    assert result["county"] == expected_county
    assert result["fips"] == expected_fips
    assert result["coverage_level"] == "statewide_core"
    assert result["scope_note"] == "statewide_core"


@pytest.mark.parametrize(
    "county",
    DEFAULT_STORE.california_counties,
    ids=lambda county: county["name"],
)
def test_location_lookup_routes_every_california_county_name(
    county: dict[str, object],
) -> None:
    result = lookup_county_from_location(str(county["name"]))

    assert "error" not in result
    assert result["state"] == "CA"
    assert result["county"] == county["name"]
    assert result["fips"] == county["fips"]
    assert result["coverage_level"] == county["coverage_level"]


def test_county_profile_returns_statewide_core_for_fresno() -> None:
    profile = get_county_profile("Fresno County")

    assert "error" not in profile
    assert profile["name"] == "Fresno County"
    assert profile["coverage_level"] == "statewide_core"
    assert profile["source_citations"]
    assert any(
        handoff["source_id"] == "ca_211_home"
        for handoff in profile["food_handoff"]
    )


def test_local_resources_fall_back_to_statewide_locator_handoff() -> None:
    results = find_local_resources("Fresno County", "food")

    assert results
    assert all(result["coverage_level"] == "statewide_locator" for result in results)
    assert all(result["call_before_going"] is True for result in results)
    assert all(
        result["availability_notice"]
        == "Call before going to confirm current availability."
        for result in results
    )
    assert any(result["source_citations"] for result in results)
    assert not any(result.get("maps_url") for result in results)


def test_benefit_matching_cites_sources() -> None:
    paths = match_benefit_paths(
        {
            "language": "en",
            "location": {"county": "Santa Clara County", "state": "CA"},
            "household_size": 3,
            "needs": ["food", "health coverage"],
        }
    )

    assert paths
    assert all(path["source_citations"] for path in paths)


def test_benefit_matching_supports_expanded_statewide_prep_paths() -> None:
    paths = match_benefit_paths(
        {
            "language": "en",
            "location": {"county": "Fresno County", "state": "CA"},
            "household_size": 3,
            "adults": 1,
            "children_ages": [3, 8],
            "needs": [
                "child care",
                "school meals",
                "phone discount",
                "legal aid",
                "ihss in-home support",
            ],
        },
        county_profile=get_county_profile("Fresno County"),
    )

    areas = {path["area"] for path in paths}
    assert {
        "child_care_support",
        "school_meals",
        "phone_lifeline",
        "legal_aid_handoff",
        "ihss_in_home_support",
    }.issubset(areas)
    assert all(path["status_label"] in {
        "likely_worth_checking",
        "needs_more_information",
        "local_handoff_recommended",
        "not_enough_evidence",
    } for path in paths)
    assert all(path["source_citations"] for path in paths)


def test_benefit_matching_accepts_string_program_area_ids_from_tool_calls() -> None:
    paths = match_benefit_paths(
        {
            "language": "en",
            "location": {"county": "Fresno County", "state": "CA"},
            "household_size": 2,
            "needs": ["simple steps"],
        },
        county_profile=get_county_profile("Fresno County"),
        benefit_program_areas=["phone_lifeline", "food_calfresh"],
    )

    areas = {path["area"] for path in paths}
    assert areas == {"phone_lifeline", "food_calfresh"}
    assert all(path["source_citations"] for path in paths)


def test_benefit_matching_cites_correct_county_sources() -> None:
    # Test San Francisco location
    sf_profile = {
        "id": "san_francisco_county",
        "name": "San Francisco City and County",
        "state": "CA",
        "source_ids": ["sf_hsh_department", "sf_coordinated_entry"],
    }

    paths = match_benefit_paths(
        household_snapshot={
            "language": "en",
            "location": {"county": "San Francisco County", "state": "CA"},
            "needs": ["housing"],
        },
        county_profile=sf_profile,
    )

    housing_path = next(p for p in paths if p["area"] == "housing_homelessness")
    citations = housing_path["source_citations"]
    assert isinstance(citations, list)

    # Assert San Francisco sources are used, not San Jose/Santa Clara ones
    source_ids = [c["source_id"] for c in citations]
    assert "sf_hsh_department" in source_ids or "sf_coordinated_entry" in source_ids
    assert "sanjose_homeless_services_guide" not in source_ids
    assert "scc_osh_temporary_emergency_shelter" not in source_ids


def test_maps_enrichment_uses_curated_query_not_user_origin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = _MapsPlacesProvider()
    monkeypatch.setenv("ENABLE_GOOGLE_MAPS", "true")
    google_integrations.set_maps_places_provider(provider)

    results = find_local_resources("San Jose, CA near me", "food", radius=5)

    assert results
    assert provider.queries
    assert all("near me" not in query.lower() for query in provider.queries)
    enriched = [result for result in results if result.get("maps_enrichment")]
    assert enriched
    enrichment = enriched[0]["maps_enrichment"]
    assert enrichment["provider"] == "google_places"
    assert enrichment["availability_notice"] == (
        "Google Places details may change. Call before going."
    )
    assert "formatted_address" not in enrichment
    assert "open_now" not in enrichment


def test_maps_enrichment_suppressed_for_safety_sensitive_resources(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = _MapsPlacesProvider()
    monkeypatch.setenv("ENABLE_GOOGLE_MAPS", "true")
    google_integrations.set_maps_places_provider(provider)

    results = find_local_resources(
        "Santa Clara County",
        "food",
        safety_sensitive=True,
    )

    assert results
    assert provider.queries == []
    assert all("maps_enrichment" not in result for result in results)
