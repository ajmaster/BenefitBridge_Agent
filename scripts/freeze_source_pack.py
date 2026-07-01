#!/usr/bin/env python3
"""Freeze raw reference source-pack files into app/data fixtures."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_ROOT = ROOT / "references" / "docs" / "benefitbridge_ca_source_pack"
APP_DATA = ROOT / "app" / "data"

COPIES = [
    (
        REFERENCE_ROOT / "sources" / "approved_sources.json",
        APP_DATA / "source_pack" / "approved_sources.json",
    ),
    (
        REFERENCE_ROOT / "sources" / "program_areas.json",
        APP_DATA / "source_pack" / "program_areas.json",
    ),
    (
        REFERENCE_ROOT / "sources" / "county_profiles.json",
        APP_DATA / "source_pack" / "county_profiles.json",
    ),
    (
        REFERENCE_ROOT / "sources" / "local_resources_hsds_seed.json",
        APP_DATA / "source_pack" / "local_resources_hsds_seed.json",
    ),
    (
        REFERENCE_ROOT / "config" / "approved_domains.txt",
        APP_DATA / "source_pack" / "approved_domains.txt",
    ),
    (
        ROOT / "references" / "docs" / "benefitbridge_tool_contracts.json",
        APP_DATA / "contracts" / "benefitbridge_tool_contracts.json",
    ),
    (
        REFERENCE_ROOT / "schemas" / "benefitbridge_schemas.json",
        APP_DATA / "schemas" / "benefitbridge_schemas.json",
    ),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    for source, destination in COPIES:
        if not source.exists():
            raise FileNotFoundError(source)
        if args.dry_run:
            print(
                f"would copy {source.relative_to(ROOT)} -> {destination.relative_to(ROOT)}"
            )
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        print(f"copied {source.relative_to(ROOT)} -> {destination.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
