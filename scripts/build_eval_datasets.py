#!/usr/bin/env python3
"""Build eval dataset fixtures from the reference source pack in agents-cli format."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE_ROOT = ROOT / "references" / "docs"
PACK_ROOT = REFERENCE_ROOT / "benefitbridge_ca_source_pack" / "eval"
BUILD_SPEC_ROOT = REFERENCE_ROOT / "BenefitBridge_CA_Build_Spec_Package"
DESTINATION = ROOT / "tests" / "eval" / "datasets"

DATASETS = [
    (
        PACK_ROOT / "gold_profiles.json",
        DESTINATION / "benefitbridge_gold_profiles.json",
    ),
    (PACK_ROOT / "red_team_tests.json", DESTINATION / "benefitbridge_red_team.json"),
    (
        BUILD_SPEC_ROOT / "benefitbridge_expanded_synthetic_profiles.json",
        DESTINATION / "benefitbridge_expanded_profiles.json",
    ),
]


def make_prompt_from_profile(profile: dict) -> dict:
    lang = "Spanish" if profile.get("language") == "es" else "English"
    location = profile.get("location") or profile.get("geo", "")
    household = profile.get("household", "")
    income = profile.get("income", "")
    housing = profile.get("housing", "")
    needs = ", ".join(profile.get("needs", []))

    text = (
        f"Hello. I want to prepare for benefits in California. Here is my household situation:\n"
        f"- Preferred language: {lang}\n"
        f"- Location: {location}\n"
        f"- Household: {household}\n"
        f"- Income: {income}\n"
        f"- Housing: {housing}\n"
        f"- Needs: {needs}\n"
        f"\nPlease help me prepare a benefits packet with relevant paths, missing facts, checklists, caseworker questions, call script, and local handoffs."
    )
    return {"role": "user", "parts": [{"text": text}]}


def convert_dataset(source_path: Path) -> dict:
    with source_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    cases = []
    if isinstance(data, list):
        for item in data:
            case = dict(item)
            if "prompt" not in case and "profile" in case:
                case["prompt"] = make_prompt_from_profile(case["profile"])
            elif "prompt" not in case and _looks_like_expanded_profile(case):
                case["prompt"] = make_prompt_from_profile(case)
            elif "prompt" in case and isinstance(case["prompt"], str):
                case["prompt"] = {"role": "user", "parts": [{"text": case["prompt"]}]}
            cases.append(case)
    else:
        cases = [data]

    return {"eval_cases": cases}


def _looks_like_expanded_profile(case: dict) -> bool:
    return any(key in case for key in ("geo", "household", "needs", "language"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    for source, destination in DATASETS:
        if not source.exists():
            raise FileNotFoundError(source)

        converted = convert_dataset(source)
        records = len(converted["eval_cases"])

        if args.dry_run:
            print(f"would convert {records} records: {source.relative_to(ROOT)}")
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("w", encoding="utf-8") as handle:
            json.dump(converted, handle, indent=2, sort_keys=True)
        print(
            f"converted and copied {records} records -> {destination.relative_to(ROOT)}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
