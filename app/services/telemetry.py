"""Privacy-preserving telemetry helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class TelemetryEvent:
    flow_step: str
    county: str | None = None
    city_bucket: str | None = None
    language: str | None = None
    tool_name: str | None = None
    source_ids: list[str] = field(default_factory=list)
    status_labels: list[str] = field(default_factory=list)
    validation_passed: bool | None = None
    redaction_counts: dict[str, int] = field(default_factory=dict)
    latency_ms: int | None = None
    error_code: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "flow_step": self.flow_step,
            "county": self.county,
            "city_bucket": self.city_bucket,
            "language": self.language,
            "tool_name": self.tool_name,
            "source_ids": self.source_ids,
            "status_labels": self.status_labels,
            "validation_passed": self.validation_passed,
            "redaction_counts": self.redaction_counts,
            "latency_ms": self.latency_ms,
            "error_code": self.error_code,
        }


def summarize_redactions(findings: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding] = counts.get(finding, 0) + 1
    return counts
