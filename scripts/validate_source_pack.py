#!/usr/bin/env python3
"""Validate BenefitBridge runtime source-pack fixtures."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "app" / "data"
SOURCE_ROOT = DATA_ROOT / "source_pack"
CONTRACT_ROOT = DATA_ROOT / "contracts"
SCHEMA_ROOT = DATA_ROOT / "schemas"

REQUIRED_TOOLS = {
    "lookup_county_from_location",
    "get_county_profile",
    "retrieve_approved_source",
    "search_source_snapshot",
    "get_benefit_program_area",
    "match_benefit_paths",
    "find_local_resources",
    "get_healthcare_gov_content",
    "search_hud_housing_counselors",
    "query_datasf_socrata",
    "redact_pii",
    "validate_packet",
    "translate_packet",
    "export_packet",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def url_domain(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def source_ids_from_handoffs(profile: dict) -> set[str]:
    ids: set[str] = set(profile.get("source_ids", []))
    for value in profile.values():
        if isinstance(value, dict) and value.get("source_id"):
            ids.add(value["source_id"])
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict) and item.get("source_id"):
                    ids.add(item["source_id"])
    return ids


def main() -> int:
    failures: list[str] = []

    approved_sources = load_json(SOURCE_ROOT / "approved_sources.json")
    program_areas = load_json(SOURCE_ROOT / "program_areas.json")
    california_counties = load_json(SOURCE_ROOT / "california_counties.json")
    county_profiles = load_json(SOURCE_ROOT / "county_profiles.json")
    local_resources = load_json(SOURCE_ROOT / "local_resources_hsds_seed.json")
    contracts = load_json(CONTRACT_ROOT / "benefitbridge_tool_contracts.json")
    load_json(SCHEMA_ROOT / "benefitbridge_schemas.json")

    domains = {
        line.strip().lower().removeprefix("www.")
        for line in (SOURCE_ROOT / "approved_domains.txt")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.strip() and not line.startswith("#")
    }

    ids = [source.get("id") for source in approved_sources]
    source_ids = set(ids)
    if len(ids) != len(source_ids):
        failures.append("approved_sources.json contains duplicate source IDs")

    county_names = [county.get("name") for county in california_counties]
    county_fips = [county.get("fips") for county in california_counties]
    if len(california_counties) != 58:
        failures.append(
            f"california_counties.json must contain 58 counties; found {len(california_counties)}"
        )
    if len(county_names) != len(set(county_names)):
        failures.append("california_counties.json contains duplicate county names")
    if len(county_fips) != len(set(county_fips)):
        failures.append("california_counties.json contains duplicate FIPS values")
    for county in california_counties:
        county_id = county.get("id") or county.get("name")
        if county.get("state") != "CA":
            failures.append(f"{county_id}: county state must be CA")
        if not county.get("fips"):
            failures.append(f"{county_id}: missing county FIPS")
        if county.get("coverage_level") not in {"reviewed_local", "statewide_core"}:
            failures.append(f"{county_id}: invalid coverage_level")
        if not county.get("aliases"):
            failures.append(f"{county_id}: missing aliases")

    for source in approved_sources:
        source_id = source.get("id")
        url = source.get("url", "")
        if not source_id:
            failures.append("source missing id")
        if not source.get("last_checked"):
            failures.append(f"{source_id}: missing last_checked")
        if not source.get("safe_claims"):
            failures.append(f"{source_id}: missing safe_claims")
        domain = url_domain(url)
        if domain and domain not in domains:
            failures.append(f"{source_id}: domain not allowlisted: {domain}")

    for area in program_areas:
        area_id = area.get("program_area_id")
        referenced = set(area.get("primary_source_ids", []))
        referenced |= set(area.get("immediate_handoff_source_ids", []))
        referenced |= set(area.get("legal_handoff_source_ids", []))
        missing = sorted(referenced - source_ids)
        if missing:
            failures.append(f"{area_id}: unknown source IDs: {missing}")

    for profile in county_profiles:
        profile_id = profile.get("id")
        missing = sorted(source_ids_from_handoffs(profile) - source_ids)
        if missing:
            failures.append(f"{profile_id}: unknown source IDs: {missing}")

    profiles_by_county = {
        profile.get("county_name", profile.get("name")): profile
        for profile in county_profiles
        if profile.get("fips_hint")
    }
    for county in california_counties:
        profile = profiles_by_county.get(county.get("name"))
        if not profile:
            failures.append(f"{county.get('name')}: missing county profile")
            continue
        if profile.get("fips_hint") != county.get("fips"):
            failures.append(f"{county.get('name')}: profile FIPS mismatch")
        if not profile.get("source_ids"):
            failures.append(f"{county.get('name')}: profile missing source_ids")
        if profile.get("coverage_level") not in {"reviewed_local", "statewide_core"}:
            failures.append(f"{county.get('name')}: profile missing coverage_level")

    for resource in local_resources:
        resource_id = resource.get("id")
        referenced = set(resource.get("source_ids", []))
        if resource.get("source_id"):
            referenced.add(resource["source_id"])
        missing = sorted(referenced - source_ids)
        if missing:
            failures.append(f"{resource_id}: unknown source IDs: {missing}")

    contract_names = {contract.get("name") for contract in contracts}
    missing_tools = sorted(REQUIRED_TOOLS - contract_names)
    extra_tools = sorted(contract_names - REQUIRED_TOOLS)
    if missing_tools:
        failures.append(f"missing tool contracts: {missing_tools}")
    if extra_tools:
        failures.append(f"unexpected tool contracts: {extra_tools}")

    if failures:
        print("Source pack validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        "Source pack validation passed: "
        f"{len(source_ids)} sources, "
        f"{len(program_areas)} program areas, "
        f"{len(california_counties)} California counties, "
        f"{len(county_profiles)} county profiles, "
        f"{len(local_resources)} local resources, "
        f"{len(contract_names)} tool contracts."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
