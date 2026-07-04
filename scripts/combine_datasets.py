#!/usr/bin/env python3
"""Combine all eval datasets in the workspace into tests/eval/datasets/basic-dataset.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ROOT / "tests" / "eval" / "datasets"
DESTINATION = DATASETS_DIR / "basic-dataset.json"

DATASET_FILES = [
    DATASETS_DIR / "benefitbridge_gold_profiles.json",
    DATASETS_DIR / "benefitbridge_red_team.json",
    DATASETS_DIR / "benefitbridge_expanded_profiles.json",
    DATASETS_DIR / "benefitbridge_statewide_expansion.json",
]


def main() -> int:
    combined_cases = []
    seen_ids = set()

    for path in DATASET_FILES:
        if not path.exists():
            print(f"Warning: {path.name} not found, skipping.")
            continue

        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)

        cases = data.get("eval_cases", [])
        added_count = 0
        for case in cases:
            case_id = case.get("eval_case_id") or case.get("id")
            if not case_id:
                print(f"Warning: case in {path.name} has no ID, skipping.")
                continue

            # Ensure we use eval_case_id as the standard key
            case["eval_case_id"] = case_id
            if "id" in case:
                del case["id"]

            if case_id in seen_ids:
                # Append file name prefix to avoid collision if duplicate
                case_id = f"{path.stem}_{case_id}"
                case["eval_case_id"] = case_id

            seen_ids.add(case_id)
            combined_cases.append(case)
            added_count += 1

        print(f"Added {added_count} cases from {path.name}")

    output_data = {"eval_cases": combined_cases}

    with DESTINATION.open("w", encoding="utf-8") as handle:
        json.dump(output_data, handle, indent=2, sort_keys=True)

    print(
        f"Successfully combined {len(combined_cases)} cases into {DESTINATION.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
