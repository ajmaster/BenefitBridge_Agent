import pytest

from app.tools.benefits import match_benefit_paths
from app.tools.jurisdiction import lookup_county_from_location


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
