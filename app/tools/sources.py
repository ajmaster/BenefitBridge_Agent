"""Approved source and county profile tools."""

from __future__ import annotations

from app.schemas import ToolError
from app.services.source_store import DEFAULT_STORE


def get_county_profile(county_or_city: str) -> dict[str, object]:
    """Return local pilot profile for Santa Clara/San Jose or San Francisco."""

    profile = DEFAULT_STORE.county_profile(county_or_city)
    if profile is None:
        return ToolError(
            code="COUNTY_NOT_SUPPORTED",
            message="This county/city is outside the curated pilot profile set.",
        ).to_dict()
    citations = [
        DEFAULT_STORE.citation(source_id).to_dict()
        for source_id in profile.get("source_ids", [])
        if source_id in DEFAULT_STORE.approved_sources_by_id
    ]
    return {**profile, "source_citations": citations}


def retrieve_approved_source(source_id: str) -> dict[str, object]:
    """Fetch approved source metadata and citation fields by source ID."""

    if source_id not in DEFAULT_STORE.approved_sources_by_id:
        return ToolError(
            code="SOURCE_NOT_FOUND",
            message=f"Unknown approved source ID: {source_id}",
            blocking=True,
        ).to_dict()
    return DEFAULT_STORE.source_metadata(source_id)


def search_source_snapshot(
    query: str,
    jurisdiction: str | None = None,
    program_area: str | None = None,
    source_type: str | None = None,
    owner_type: str | None = None,
    freshness_state: str | None = None,
    coverage_level: str | None = None,
) -> list[dict[str, object]]:
    """Search the approved fixture source corpus."""

    return DEFAULT_STORE.search_sources(
        query,
        jurisdiction=jurisdiction,
        program_area=program_area,
        source_type=source_type,
        owner_type=owner_type,
        freshness_state=freshness_state,
        coverage_level=coverage_level,
    )
