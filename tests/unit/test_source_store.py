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

EXPECTED_CALIFORNIA_COUNTY_FIPS = {
    "Alameda County": "06001",
    "Alpine County": "06003",
    "Amador County": "06005",
    "Butte County": "06007",
    "Calaveras County": "06009",
    "Colusa County": "06011",
    "Contra Costa County": "06013",
    "Del Norte County": "06015",
    "El Dorado County": "06017",
    "Fresno County": "06019",
    "Glenn County": "06021",
    "Humboldt County": "06023",
    "Imperial County": "06025",
    "Inyo County": "06027",
    "Kern County": "06029",
    "Kings County": "06031",
    "Lake County": "06033",
    "Lassen County": "06035",
    "Los Angeles County": "06037",
    "Madera County": "06039",
    "Marin County": "06041",
    "Mariposa County": "06043",
    "Mendocino County": "06045",
    "Merced County": "06047",
    "Modoc County": "06049",
    "Mono County": "06051",
    "Monterey County": "06053",
    "Napa County": "06055",
    "Nevada County": "06057",
    "Orange County": "06059",
    "Placer County": "06061",
    "Plumas County": "06063",
    "Riverside County": "06065",
    "Sacramento County": "06067",
    "San Benito County": "06069",
    "San Bernardino County": "06071",
    "San Diego County": "06073",
    "San Francisco County": "06075",
    "San Joaquin County": "06077",
    "San Luis Obispo County": "06079",
    "San Mateo County": "06081",
    "Santa Barbara County": "06083",
    "Santa Clara County": "06085",
    "Santa Cruz County": "06087",
    "Shasta County": "06089",
    "Sierra County": "06091",
    "Siskiyou County": "06093",
    "Solano County": "06095",
    "Sonoma County": "06097",
    "Stanislaus County": "06099",
    "Sutter County": "06101",
    "Tehama County": "06103",
    "Trinity County": "06105",
    "Tulare County": "06107",
    "Tuolumne County": "06109",
    "Ventura County": "06111",
    "Yolo County": "06113",
    "Yuba County": "06115",
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


def test_california_county_fixture_covers_all_58_counties() -> None:
    counties_by_name = {
        county["name"]: county for county in DEFAULT_STORE.california_counties
    }

    assert set(counties_by_name) == set(EXPECTED_CALIFORNIA_COUNTY_FIPS)
    for name, fips in EXPECTED_CALIFORNIA_COUNTY_FIPS.items():
        county = counties_by_name[name]
        assert county["state"] == "CA"
        assert county["fips"] == fips
        assert county["coverage_level"] in {"reviewed_local", "statewide_core"}
        assert county["aliases"]


def test_county_profiles_cover_all_california_counties_with_core_sources() -> None:
    approved_ids = set(DEFAULT_STORE.approved_sources_by_id)
    profiles_by_county = {
        profile.get("county_name", profile["name"]): profile
        for profile in DEFAULT_STORE.county_profiles
        if profile.get("fips_hint")
    }

    assert set(EXPECTED_CALIFORNIA_COUNTY_FIPS).issubset(profiles_by_county)
    for name, fips in EXPECTED_CALIFORNIA_COUNTY_FIPS.items():
        profile = profiles_by_county[name]
        assert profile["state"] == "CA"
        assert profile["fips_hint"] == fips
        assert profile["coverage_level"] in {"reviewed_local", "statewide_core"}
        assert profile.get("source_ids")
        assert set(profile["source_ids"]).issubset(approved_ids)


def test_source_search_can_filter_statewide_core_sources() -> None:
    results = DEFAULT_STORE.search_sources(
        "locator",
        jurisdiction="California",
        coverage_level="statewide_core",
        freshness_state="current",
    )

    assert results
    assert all(result["freshness_state"] == "current" for result in results)
    assert any(result["id"] == "ca_211_home" for result in results)


def test_california_county_summaries_cover_all_58_counties() -> None:
    summaries = DEFAULT_STORE.california_county_summaries()
    counts = DEFAULT_STORE.california_coverage_counts()

    assert len(summaries) == 58
    assert counts == {
        "total_counties": 58,
        "reviewed_local": 9,
        "statewide_core": 49,
        "approved_sources": len(DEFAULT_STORE.approved_sources),
        "local_resources": len(DEFAULT_STORE.local_resources),
    }

    los_angeles = next(
        county for county in summaries if county["name"] == "Los Angeles County"
    )
    assert los_angeles["coverage_level"] == "statewide_core"
    assert los_angeles["source_count"] > 0

    santa_clara = next(
        county for county in summaries if county["name"] == "Santa Clara County"
    )
    assert santa_clara["coverage_level"] == "reviewed_local"
    assert santa_clara["local_resource_count"] > 0
