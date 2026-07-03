"""Read-only access to the curated AidAtlasCA source pack."""

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

STATEWIDE_CORE_SOURCE_IDS = {
    "benefitscal_info",
    "benefitscal_login",
    "cdss_calfresh_home",
    "usda_snap_california_directory",
    "cdph_wic_home",
    "cdph_wic_office_grocer_locator",
    "dhcs_medi_cal_apply",
    "dhcs_county_offices",
    "covered_ca_get_started",
    "csd_liheap_program",
    "caliheapapply_home",
    "cdss_county_offices",
    "cdss_food_banks",
    "cafoodbanks_members",
    "cpuc_211_info",
    "ca_211_home",
    "hud_housing_counselor_api",
}


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
    def california_counties(self) -> list[dict[str, Any]]:
        return self._load_json("california_counties.json")

    @cached_property
    def california_counties_by_name(self) -> dict[str, dict[str, Any]]:
        counties: dict[str, dict[str, Any]] = {}
        for county in self.california_counties:
            names = [county.get("name", "")]
            names.extend(county.get("aliases", []))
            names.extend(county.get("major_cities", []))
            for name in names:
                normalized = _normalize_key(str(name))
                if normalized:
                    counties[normalized] = county
        return counties

    @cached_property
    def location_hints(self) -> list[tuple[str, str]]:
        hints: dict[str, str] = {}
        for county in self.california_counties:
            county_name = str(county["name"])
            for value in [county_name, *county.get("aliases", [])]:
                hints[str(value).lower()] = county_name
            for city in county.get("major_cities", []):
                hints[str(city).lower()] = f"{city}, CA"
            for zip_hint in county.get("zip_hints", []):
                hint = str(zip_hint.get("prefix") or zip_hint.get("zip_code") or "")
                location_text = str(zip_hint.get("location_text") or county_name)
                if hint:
                    hints[hint.lower()] = location_text
        return sorted(hints.items(), key=lambda item: len(item[0]), reverse=True)

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
            "coverage_level": _source_coverage_level(source),
            "source_citation": self.citation(source_id).to_dict(),
        }

    def search_sources(
        self,
        query: str,
        *,
        jurisdiction: str | None = None,
        program_area: str | None = None,
        source_type: str | None = None,
        owner_type: str | None = None,
        freshness_state: str | None = None,
        coverage_level: str | None = None,
    ) -> list[dict[str, Any]]:
        terms = [_normalize_query_term(term) for term in query.lower().split() if term]
        results: list[dict[str, Any]] = []
        if program_area and program_area in self.program_areas_by_id:
            ids = self.program_areas_by_id[program_area].get("primary_source_ids", [])
            return [
                metadata
                for source_id in ids
                if source_id in self.approved_sources_by_id
                for metadata in [self.source_metadata(source_id)]
                if _metadata_matches(
                    metadata,
                    jurisdiction=jurisdiction,
                    source_type=source_type,
                    owner_type=owner_type,
                    freshness_state=freshness_state,
                    coverage_level=coverage_level,
                )
            ]

        for source in self.approved_sources:
            metadata = self.source_metadata(source["id"])
            haystack = _source_haystack(metadata)
            if not _metadata_matches(
                metadata,
                jurisdiction=jurisdiction,
                source_type=source_type,
                owner_type=owner_type,
                freshness_state=freshness_state,
                coverage_level=coverage_level,
            ):
                continue
            if terms and not all(term in haystack for term in terms):
                continue
            results.append(metadata)
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
        needle = _normalize_key(county_or_city)
        for profile in self.county_profiles:
            names = [
                str(profile.get("name", "")),
                str(profile.get("county_name", "")),
                *[str(city) for city in profile.get("cities_in_scope", [])],
            ]
            normalized_names = [_normalize_key(name) for name in names if name]
            if needle in normalized_names or any(needle in name for name in normalized_names):
                return profile
        return None

    def california_county(self, location_text: str) -> dict[str, Any] | None:
        normalized = _normalize_key(location_text)
        if not normalized:
            return None
        direct = self.california_counties_by_name.get(normalized)
        if direct:
            return direct
        for key, county in self.california_counties_by_name.items():
            if _contains_location_alias(normalized, key):
                return county
        return None

    def california_county_summaries(self) -> list[dict[str, Any]]:
        profiles_by_fips = {
            str(profile.get("fips_hint")): profile
            for profile in self.county_profiles
            if profile.get("fips_hint")
        }
        local_resource_counts = self._local_resource_counts_by_county()
        summaries: list[dict[str, Any]] = []
        for county in self.california_counties:
            fips = str(county.get("fips", ""))
            profile = profiles_by_fips.get(fips) or self.county_profile(
                str(county.get("name", ""))
            )
            source_ids = [
                source_id
                for source_id in (profile or {}).get("source_ids", [])
                if source_id in self.approved_sources_by_id
            ]
            coverage_level = str(
                county.get("coverage_level")
                or (profile or {}).get("coverage_level")
                or "statewide_core"
            )
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
                    "source_ids": source_ids,
                    "source_count": len(source_ids),
                    "local_resource_count": local_resource_counts.get(fips, 0),
                    "primary_benefits_office": (profile or {}).get(
                        "primary_benefits_office"
                    ),
                }
            )
        return summaries

    def california_coverage_counts(self) -> dict[str, int]:
        summaries = self.california_county_summaries()
        return {
            "total_counties": len(summaries),
            "reviewed_local": sum(
                1 for county in summaries if county["coverage_level"] == "reviewed_local"
            ),
            "statewide_core": sum(
                1 for county in summaries if county["coverage_level"] == "statewide_core"
            ),
            "approved_sources": len(self.approved_sources),
            "local_resources": len(self.local_resources),
        }

    def _local_resource_counts_by_county(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for county in self.california_counties:
            county_name = str(county.get("name", ""))
            fips = str(county.get("fips", ""))
            aliases = [
                county_name,
                county_name.replace(" County", ""),
                *[str(alias) for alias in county.get("aliases", [])],
            ]
            normalized_aliases = {
                _normalize_key(alias) for alias in aliases if _normalize_key(alias)
            }
            counts[fips] = sum(
                1
                for resource in self.local_resources
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


def _normalize_key(value: str) -> str:
    return " ".join(value.replace(",", " ").lower().split())


def _contains_location_alias(text: str, alias: str) -> bool:
    if len(alias) <= 2:
        return f" {alias} " in f" {text} "
    return f" {alias} " in f" {text} "


def _source_coverage_level(source: dict[str, Any]) -> str:
    explicit = source.get("coverage_level")
    if explicit:
        return str(explicit)
    if source.get("id") in STATEWIDE_CORE_SOURCE_IDS:
        return "statewide_core"
    level = str(source.get("level", "")).lower()
    jurisdiction = str(source.get("jurisdiction", "")).lower()
    if level.startswith(("county", "city", "regional")) or (
        jurisdiction and jurisdiction not in {"california", "united states", "global/standard"}
    ):
        return "reviewed_local"
    return "general"


def _coverage_label(coverage_level: str) -> str:
    if coverage_level == "reviewed_local":
        return "Reviewed local resources"
    if coverage_level == "statewide_core":
        return "Statewide core"
    return coverage_level.replace("_", " ").title()


def _normalize_query_term(term: str) -> str:
    if term == "locator":
        return "resource"
    return term


def _source_haystack(source: dict[str, Any]) -> str:
    values = [
        source.get("id", ""),
        source.get("name", ""),
        source.get("jurisdiction", ""),
        source.get("level", ""),
        source.get("category", ""),
        source.get("owner_type", ""),
        source.get("integration", ""),
        source.get("use_for", ""),
        source.get("safe_claims", ""),
        source.get("caveats", ""),
        source.get("coverage_level", ""),
        source.get("freshness_state", ""),
    ]
    return " ".join(str(value).lower() for value in values)


def _metadata_matches(
    metadata: dict[str, Any],
    *,
    jurisdiction: str | None,
    source_type: str | None,
    owner_type: str | None,
    freshness_state: str | None,
    coverage_level: str | None,
) -> bool:
    haystack = _source_haystack(metadata)
    if jurisdiction and jurisdiction.lower() not in haystack:
        return False
    if source_type and source_type.lower() not in haystack:
        return False
    if owner_type and owner_type.lower() not in haystack:
        return False
    if freshness_state and metadata.get("freshness_state") != freshness_state:
        return False
    if coverage_level and metadata.get("coverage_level") != coverage_level:
        return False
    return True
