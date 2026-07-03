#!/usr/bin/env python3
"""Sync source-pack fixture data into frontend static JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "app" / "data" / "source_pack"
FRONTEND_DATA = ROOT / "frontend" / "data"


def _load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def _normalize_key(value: str) -> str:
    return " ".join(value.replace(",", " ").lower().split())


def _contains_location_alias(text: str, alias: str) -> bool:
    return f" {alias} " in f" {text} "


def _coverage_label(coverage_level: str) -> str:
    if coverage_level == "reviewed_local":
        return "Reviewed local resources"
    if coverage_level == "statewide_core":
        return "Statewide core"
    return coverage_level.replace("_", " ").title()


def _profile_for_county(
    county: dict[str, object], county_profiles: list[dict[str, object]]
) -> dict[str, object] | None:
    fips = str(county.get("fips", ""))
    county_name = str(county.get("name", ""))
    for profile in county_profiles:
        if str(profile.get("fips_hint", "")) == fips:
            return profile
    for profile in county_profiles:
        names = {
            _normalize_key(str(profile.get("name", ""))),
            _normalize_key(str(profile.get("county_name", ""))),
        }
        if _normalize_key(county_name) in names:
            return profile
    return None


def _local_resource_counts_by_fips(
    california_counties: list[dict[str, object]],
    local_resources: list[dict[str, object]],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for county in california_counties:
        county_name = str(county.get("name", ""))
        aliases = [
            county_name,
            county_name.replace(" County", ""),
            *[str(alias) for alias in county.get("aliases", [])],
        ]
        normalized_aliases = {
            _normalize_key(alias) for alias in aliases if _normalize_key(alias)
        }
        counts[str(county.get("fips", ""))] = sum(
            1
            for resource in local_resources
            if any(
                alias
                and _contains_location_alias(
                    _normalize_key(str(resource.get("jurisdiction", ""))),
                    alias,
                )
                for alias in normalized_aliases
            )
        )
    return counts


def _california_county_summaries() -> list[dict[str, object]]:
    approved_sources = _load_json(SOURCE_ROOT / "approved_sources.json")
    source_ids = {source["id"] for source in approved_sources}
    california_counties = _load_json(SOURCE_ROOT / "california_counties.json")
    county_profiles = _load_json(SOURCE_ROOT / "county_profiles.json")
    local_resources = _load_json(SOURCE_ROOT / "local_resources_hsds_seed.json")
    local_resource_counts = _local_resource_counts_by_fips(
        california_counties, local_resources
    )

    summaries: list[dict[str, object]] = []
    for county in california_counties:
        profile = _profile_for_county(county, county_profiles)
        profile_source_ids = [
            source_id
            for source_id in (profile or {}).get("source_ids", [])
            if source_id in source_ids
        ]
        coverage_level = str(
            county.get("coverage_level")
            or (profile or {}).get("coverage_level")
            or "statewide_core"
        )
        fips = str(county.get("fips", ""))
        summaries.append(
            {
                "id": county.get("id"),
                "name": county.get("name"),
                "state": county.get("state", "CA"),
                "fips": fips,
                "aliases": county.get("aliases", []),
                "major_cities": county.get("major_cities", []),
                "coverage_level": coverage_level,
                "coverage_label": _coverage_label(coverage_level),
                "profile_id": (profile or {}).get("id"),
                "source_ids": profile_source_ids,
                "source_count": len(profile_source_ids),
                "local_resource_count": local_resource_counts.get(fips, 0),
                "primary_benefits_office": (profile or {}).get(
                    "primary_benefits_office"
                ),
            }
        )
    return summaries


def _expected_files() -> dict[Path, str]:
    approved_sources = _load_json(SOURCE_ROOT / "approved_sources.json")
    california_counties = _load_json(SOURCE_ROOT / "california_counties.json")
    return {
        FRONTEND_DATA / "approvedSources.json": _json_text(approved_sources),
        FRONTEND_DATA / "californiaCounties.json": _json_text(_california_county_summaries()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync frontend static JSON from app/data/source_pack."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify generated frontend data is current without writing files.",
    )
    args = parser.parse_args()

    expected = _expected_files()
    if args.check:
        stale = [
            path.relative_to(ROOT)
            for path, text in expected.items()
            if not path.exists() or path.read_text(encoding="utf-8") != text
        ]
        if stale:
            print("Frontend source data is stale:", file=sys.stderr)
            for path in stale:
                print(f"- {path}", file=sys.stderr)
            print("Run: python3 scripts/sync_frontend_data.py", file=sys.stderr)
            return 1
        print("Frontend source data is current.")
        return 0

    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    for path, text in expected.items():
        path.write_text(text, encoding="utf-8")
    approved_sources = _load_json(SOURCE_ROOT / "approved_sources.json")
    california_counties = _load_json(SOURCE_ROOT / "california_counties.json")
    print(
        "Synced frontend source data: "
        f"{len(approved_sources)} sources, "
        f"{len(california_counties)} California counties."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
