"""Scan rendered/static copy for BenefitBridge prohibited safety claims."""

from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterable
from pathlib import Path

DEFAULT_EXTENSIONS = {".html", ".txt"}
IGNORED_DIR_NAMES = {".git", ".next", "_next", "node_modules", "test-results"}

PROHIBITED_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "eligibility_decision",
        re.compile(
            r"\b(?:you qualify|you are eligible|you are approved|"
            r"guaranteed (?:approval|benefits?|calfresh|medi-cal|wic)|"
            r"guaranteed to get)\b",
            re.I,
        ),
    ),
    (
        "application_submission",
        re.compile(
            r"\b(?:we|i|benefitbridge|this app)\s+(?:can\s+)?"
            r"(?:apply|submit|submitted|applied)(?:\s+\w+){0,8}\s+for you\b"
            r"|\b(?:we|i)\s+submitted your application\b"
            r"|\bapplication submitted\b",
            re.I,
        ),
    ),
    (
        "real_document_upload",
        re.compile(
            r"\b(?:upload|send|attach)\s+(?:your\s+)?"
            r"(?:ssn|social security|id|driver'?s license|passport|"
            r"immigration document|documents?|real documents?)\b",
            re.I,
        ),
    ),
    (
        "credential_request",
        re.compile(
            r"\b(?:send|enter|share)\s+(?:your\s+)?(?:password|pin|login|username)\b",
            re.I,
        ),
    ),
    (
        "benefit_amount_prediction",
        re.compile(
            r"\b(?:you\s+(?:will|can)\s+receive|you'?ll\s+get|"
            r"approved\s+for|will\s+get|receive)\s+\$[0-9,]+",
            re.I,
        ),
    ),
    (
        "live_shelter_availability",
        re.compile(
            r"\b(?:this|that|the)\s+shelter\s+has\s+(?:a\s+)?bed\s+available\b"
            r"|\bshelter bed is available\b",
            re.I,
        ),
    ),
    (
        "live_food_availability",
        re.compile(
            r"\b(?:food pantry|pantry|food bank).{0,40}\b(?:has|have|with)\s+"
            r"(?:food|meals).{0,20}\bavailable\b"
            r"|\bfood\s+(?:is\s+)?available\s+right\s+now\b",
            re.I,
        ),
    ),
    (
        "whole_bay_area_coverage",
        re.compile(
            r"\bserves\s+(?:the\s+)?(?:whole|entire|all(?:\s+of)?(?:\s+the)?)\s+bay area\b"
            r"|\bcover(?:s|ing)?\s+(?:the\s+)?(?:whole|entire|all(?:\s+of)?(?:\s+the)?)\s+bay area\b",
            re.I,
        ),
    ),
)


def scan_text(text: str, *, source: str) -> list[dict[str, object]]:
    """Return prohibited-claim findings for one rendered/static copy string."""

    findings: list[dict[str, object]] = []
    for finding_id, pattern in PROHIBITED_PATTERNS:
        for match in pattern.finditer(text):
            findings.append(
                {
                    "id": finding_id,
                    "source": source,
                    "line": text.count("\n", 0, match.start()) + 1,
                    "match": match.group(0),
                }
            )
    return findings


def scan_paths(paths: Iterable[str | Path]) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for raw_path in paths:
        path = Path(raw_path)
        for file_path in _iter_copy_files(path):
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            findings.extend(scan_text(text, source=str(file_path)))
    return findings


def _iter_copy_files(path: Path) -> Iterable[Path]:
    if not path.exists():
        return []
    if path.is_file():
        return [path] if _should_scan(path) else []
    return [
        item
        for item in sorted(path.rglob("*"))
        if item.is_file() and _should_scan(item)
    ]


def _should_scan(path: Path) -> bool:
    return path.suffix.lower() in DEFAULT_EXTENSIONS and not any(
        part in IGNORED_DIR_NAMES for part in path.parts
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["frontend/out"])
    args = parser.parse_args()
    findings = scan_paths(args.paths)
    if findings:
        print(json.dumps({"findings": findings}, indent=2))
        return 1
    print(json.dumps({"findings": []}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
