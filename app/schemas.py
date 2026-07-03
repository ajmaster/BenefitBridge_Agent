"""Typed runtime contracts for AidAtlasCA.

These dataclasses mirror the JSON contracts in the source pack without making the
deterministic code depend on a specific validation framework.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

StatusLabel = Literal[
    "likely_worth_checking",
    "needs_more_information",
    "local_handoff_recommended",
    "not_enough_evidence",
    "time_sensitive",
    "in_progress",
]


@dataclass(slots=True)
class ToolError:
    code: str
    message: str
    blocking: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class SourceCitation:
    source_id: str
    source_title: str
    agency_owner: str
    source_type: str
    url: str
    last_checked: str
    retrieved_at: str | None = None
    snippet: str | None = None
    freshness_state: str = "current"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class Jurisdiction:
    state: str
    county: str | None = None
    city: str | None = None
    zip_code: str | None = None
    fips: str | None = None
    confidence: float = 0.0
    source_citations: list[SourceCitation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["source_citations"] = [c.to_dict() for c in self.source_citations]
        return data


@dataclass(slots=True)
class HouseholdSnapshot:
    language: str = "en"
    location: dict[str, Any] = field(default_factory=dict)
    household_size: int | None = None
    adults: int | None = None
    children_ages: list[int] = field(default_factory=list)
    needs: list[str] = field(default_factory=list)
    income_range_monthly: str | None = None
    housing_status: str = "unknown"
    utilities_need: bool = False
    food_need_today: bool = False
    pii_collected: bool = False
    urgent_need: bool = False
    safety_sensitive: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class BenefitProgramArea:
    program_area_id: str
    display_name: str
    status_logic: list[str]
    prep_questions: list[str]
    documents_to_prepare: list[str]
    never_claim: list[str]
    primary_source_ids: list[str]
    immediate_handoff_source_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class BenefitPath:
    area: str
    program_name: str
    status_label: StatusLabel
    why_this_is_relevant: list[str]
    missing_facts: list[str]
    documents_to_prepare: list[str]
    source_citations: list[SourceCitation]
    warnings: list[str] = field(default_factory=list)
    official_links: list[str] = field(default_factory=list)
    agency_contacts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["source_citations"] = [c.to_dict() for c in self.source_citations]
        return data


@dataclass(slots=True)
class LocalResource:
    id: str
    organization: str
    service_name: str
    service_type: str
    jurisdiction: str
    phone: str | None = None
    url: str | None = None
    address: str | None = None
    hours: str | None = None
    languages: list[str] = field(default_factory=list)
    eligibility_notes: str | None = None
    call_before_going: bool = True
    coverage_level: str = "reviewed_local"
    coverage_label: str = "Reviewed local resources"
    source_citations: list[SourceCitation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["source_citations"] = [c.to_dict() for c in self.source_citations]
        return data


@dataclass(slots=True)
class PrepPacket:
    household_snapshot_summary: str
    potential_benefit_paths: list[BenefitPath]
    missing_answers: list[str]
    document_checklist: list[str]
    caseworker_questions: list[str]
    call_script: str
    safety_notice: str
    source_citations: list[SourceCitation]
    user_language: str = "en"
    immediate_help_notes: list[str] = field(default_factory=list)
    generated_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["potential_benefit_paths"] = [
            path.to_dict() for path in self.potential_benefit_paths
        ]
        data["source_citations"] = [c.to_dict() for c in self.source_citations]
        return data


@dataclass(slots=True)
class ValidationReport:
    passed: bool
    failures: list[str] = field(default_factory=list)
    blocking_failures: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "pass": self.passed,
            "failures": self.failures,
            "blocking_failures": self.blocking_failures,
        }


def citation_from_source(
    source: dict[str, Any], *, snippet: str | None = None
) -> SourceCitation:
    owner = source.get("owner_type") or source.get("jurisdiction") or "unknown"
    source_type = source.get("level") or source.get("owner_type") or "approved_source"
    safe_claims = source.get("safe_claims") or []
    return SourceCitation(
        source_id=source["id"],
        source_title=source.get("name", source["id"]),
        agency_owner=owner,
        source_type=source_type,
        url=source.get("url", ""),
        last_checked=source.get("last_checked", ""),
        snippet=snippet or (safe_claims[0] if safe_claims else None),
    )
