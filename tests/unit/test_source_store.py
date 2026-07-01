from app.services.source_store import DEFAULT_STORE


EXPECTED_BAY_AREA_COUNTY_FIPS = {
    "Alameda County": "06001",
    "Contra Costa County": "06013",
    "Marin County": "06041",
    "Napa County": "06055",
    "San Francisco City and County": "06075",
    "San Mateo County": "06081",
    "Santa Clara County": "06085",
    "Solano County": "06095",
    "Sonoma County": "06097",
}


def test_program_area_sources_resolve() -> None:
    approved_ids = set(DEFAULT_STORE.approved_sources_by_id)

    for area in DEFAULT_STORE.program_areas:
        for source_id in area.get("primary_source_ids", []):
            assert source_id in approved_ids
        for source_id in area.get("immediate_handoff_source_ids", []):
            assert source_id in approved_ids


def test_local_resources_force_call_before_going_for_unstable_services() -> None:
    resources = DEFAULT_STORE.local_resource_results("Santa Clara County", "food")

    assert resources
    assert all(resource.call_before_going for resource in resources)


def test_county_profiles_cover_nine_bay_area_counties() -> None:
    approved_ids = set(DEFAULT_STORE.approved_sources_by_id)
    profiles_by_name = {
        profile["name"]: profile
        for profile in DEFAULT_STORE.county_profiles
        if profile.get("fips_hint")
    }

    assert set(EXPECTED_BAY_AREA_COUNTY_FIPS).issubset(profiles_by_name)
    for name, fips in EXPECTED_BAY_AREA_COUNTY_FIPS.items():
        profile = profiles_by_name[name]
        assert profile["state"] == "CA"
        assert profile["fips_hint"] == fips
        assert profile.get("source_ids")
        assert set(profile["source_ids"]).issubset(approved_ids)


def test_food_resources_exist_for_each_bay_area_county() -> None:
    approved_ids = set(DEFAULT_STORE.approved_sources_by_id)

    for county in EXPECTED_BAY_AREA_COUNTY_FIPS:
        resources = DEFAULT_STORE.local_resource_results(county, "food")

        assert resources, county
        assert all(resource.call_before_going for resource in resources)
        for resource in resources:
            assert resource.source_citations, resource.id
            assert {
                citation.source_id for citation in resource.source_citations
            }.issubset(approved_ids)
