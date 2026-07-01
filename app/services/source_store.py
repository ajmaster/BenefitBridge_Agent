"""Read-only access to the curated BenefitBridge source pack."""

from __future__ import annotations

import json
from functools import cached_property
from pathlib import Path
from typing import Any

from app.config import SOURCE_PACK_ROOT
from app.policies.freshness import freshness_state, requires_call_before_going
from app.schemas import (
    BenefitProgramArea,
    LocalResource,
    SourceCitation,
    citation_from_source,
)


class SourceStore:
    """Small fixture-backed source store.

    Runtime packet generation is intentionally fixture-first. Live API data is only
    used by explicit smoke/refresh helpers unless later enabled.
    """

    def __init__(self, root: Path = SOURCE_PACK_ROOT) -> None:
        self.root = root

    def _load_json(self, name: str) -> Any:
        with (self.root / name).open(encoding="utf-8") as handle:
            return json.load(handle)

    @cached_property
    def approved_sources(self) -> list[dict[str, Any]]:
        return self._load_json("approved_sources.json")

    @cached_property
    def approved_sources_by_id(self) -> dict[str, dict[str, Any]]:
        return {source["id"]: source for source in self.approved_sources}

    @cached_property
    def approved_domains(self) -> set[str]:
        text = (self.root / "approved_domains.txt").read_text(encoding="utf-8")
        return {line.strip().lower() for line in text.splitlines() if line.strip()}

    @cached_property
    def program_areas(self) -> list[dict[str, Any]]:
        return self._load_json("program_areas.json")

    @cached_property
    def program_areas_by_id(self) -> dict[str, dict[str, Any]]:
        return {area["program_area_id"]: area for area in self.program_areas}

    @cached_property
    def county_profiles(self) -> list[dict[str, Any]]:
        return self._load_json("county_profiles.json")

    @cached_property
    def local_resources(self) -> list[dict[str, Any]]:
        return self._load_json("local_resources_hsds_seed.json")

    def citation(self, source_id: str, *, snippet: str | None = None) -> SourceCitation:
        source = self.approved_sources_by_id[source_id]
        citation = citation_from_source(source, snippet=snippet)
        citation.freshness_state = freshness_state(source)
        return citation

    def source_metadata(self, source_id: str) -> dict[str, Any]:
        source = self.approved_sources_by_id[source_id]
        return {
            **source,
            "freshness_state": freshness_state(source),
            "source_citation": self.citation(source_id).to_dict(),
        }

    def search_sources(
        self,
        query: str,
        *,
        jurisdiction: str | None = None,
        program_area: str | None = None,
        source_type: str | None = None,
    ) -> list[dict[str, Any]]:
        terms = [term for term in query.lower().split() if term]
        results: list[dict[str, Any]] = []
        if program_area and program_area in self.program_areas_by_id:
            ids = self.program_areas_by_id[program_area].get("primary_source_ids", [])
            return [self.source_metadata(source_id) for source_id in ids]

        for source in self.approved_sources:
            haystack = " ".join(
                str(source.get(key, ""))
                for key in (
                    "id",
                    "name",
                    "jurisdiction",
                    "level",
                    "category",
                    "owner_type",
                )
            ).lower()
            if jurisdiction and jurisdiction.lower() not in haystack:
                continue
            if source_type and source_type.lower() not in haystack:
                continue
            if terms and not all(term in haystack for term in terms):
                continue
            results.append(self.source_metadata(source["id"]))
        return results

    def program_area(self, program_area_id: str) -> BenefitProgramArea:
        area = self.program_areas_by_id[program_area_id]
        return BenefitProgramArea(
            program_area_id=area["program_area_id"],
            display_name=area["display_name"],
            status_logic=area.get("status_logic", []),
            prep_questions=area.get("prep_questions", []),
            documents_to_prepare=area.get("documents_to_prepare", []),
            never_claim=area.get("never_claim", []),
            primary_source_ids=area.get("primary_source_ids", []),
            immediate_handoff_source_ids=area.get("immediate_handoff_source_ids", []),
        )

    def county_profile(self, county_or_city: str) -> dict[str, Any] | None:
        needle = county_or_city.lower()
        for profile in self.county_profiles:
            cities = [city.lower() for city in profile.get("cities_in_scope", [])]
            if needle in str(profile.get("name", "")).lower() or needle in cities:
                return profile
        return None

    def local_resource_results(
        self, jurisdiction: str, need_type: str | None = None
    ) -> list[LocalResource]:
        jurisdiction_key = jurisdiction.lower()
        need_key = (need_type or "").lower()
        resources: list[LocalResource] = []
        for raw in self.local_resources:
            raw_jurisdiction = str(raw.get("jurisdiction", "")).lower()
            service_type = str(raw.get("service_type", "")).lower()
            service_name = str(raw.get("service_name", "")).lower()
            if (
                jurisdiction_key not in raw_jurisdiction
                and raw_jurisdiction not in jurisdiction_key
            ):
                continue
            if (
                need_key
                and need_key not in service_type
                and need_key not in service_name
            ):
                continue
            source_id = raw.get("source_id")
            citations = (
                [self.citation(source_id)]
                if source_id in self.approved_sources_by_id
                else []
            )
            resources.append(
                LocalResource(
                    id=raw["id"],
                    organization=raw.get("organization", ""),
                    service_name=raw.get("service_name", ""),
                    service_type=raw.get("service_type", ""),
                    jurisdiction=raw.get("jurisdiction", ""),
                    phone=raw.get("phone"),
                    url=raw.get("url"),
                    address=raw.get("address"),
                    hours=raw.get("hours"),
                    languages=raw.get("languages", []),
                    eligibility_notes=raw.get("eligibility_notes"),
                    call_before_going=requires_call_before_going(raw),
                    source_citations=citations,
                )
            )
        return resources


DEFAULT_STORE = SourceStore()
