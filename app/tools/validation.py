"""Packet validation tool."""

from __future__ import annotations

from typing import Any

from app.policies.privacy import redact_pii
from app.policies.source_grounding import (
    prohibited_claim_failures,
    validate_url_allowlist,
)
from app.schemas import ValidationReport
from app.services.source_store import DEFAULT_STORE


def validate_packet(
    packet: dict[str, Any],
    source_metadata: list[dict[str, Any]] | None = None,
    household_snapshot: dict[str, Any] | None = None,
) -> dict[str, object]:
    """Validate packet schema-critical fields, citations, URLs, and unsafe claims."""

    failures: list[str] = []
    blocking: list[str] = []

    required = {
        "household_snapshot_summary",
        "potential_benefit_paths",
        "missing_answers",
        "document_checklist",
        "caseworker_questions",
        "call_script",
        "safety_notice",
        "source_citations",
    }
    missing_required = sorted(required.difference(packet))
    for field in missing_required:
        blocking.append(f"SCHEMA_VALIDATION_FAILED:missing:{field}")

    paths = packet.get("potential_benefit_paths") or []
    if not isinstance(paths, list):
        blocking.append("SCHEMA_VALIDATION_FAILED:potential_benefit_paths")
        paths = []

    urls: list[str] = []
    text_parts = _walk_strings(
        {
            "household_snapshot_summary": packet.get("household_snapshot_summary", ""),
            "missing_answers": packet.get("missing_answers", []),
            "document_checklist": packet.get("document_checklist", []),
            "caseworker_questions": packet.get("caseworker_questions", []),
            "call_script": packet.get("call_script", ""),
            "safety_notice": packet.get("safety_notice", ""),
            "household_snapshot": household_snapshot or {},
        }
    )
    for citation in packet.get("source_citations", []) or []:
        if citation.get("url"):
            urls.append(citation["url"])
        if citation.get("source_id") not in DEFAULT_STORE.approved_sources_by_id:
            blocking.append(f"CITATION_UNKNOWN:{citation.get('source_id')}")

    for path in paths:
        citations = path.get("source_citations") or []
        if not citations:
            blocking.append(f"CITATION_MISSING:{path.get('program_name', 'unknown')}")
        for citation in citations:
            source_id = citation.get("source_id")
            if source_id not in DEFAULT_STORE.approved_sources_by_id:
                blocking.append(f"CITATION_UNKNOWN:{source_id}")
            if citation.get("url"):
                urls.append(citation["url"])
        urls.extend(str(url) for url in path.get("official_links", []) if url)
        text_parts.append(str(path.get("program_name", "")))
        text_parts.extend(_walk_strings(path))

    source_ids = {
        item.get("source_id")
        for item in source_metadata or []
        if isinstance(item, dict) and item.get("source_id")
    }
    if source_ids:
        known = set(DEFAULT_STORE.approved_sources_by_id)
        unknown = sorted(source_ids.difference(known))
        blocking.extend(f"CITATION_UNKNOWN:{source_id}" for source_id in unknown)

    url_failures = validate_url_allowlist(urls, DEFAULT_STORE.approved_domains)
    blocking.extend(url_failures)
    failures.extend(url_failures)

    claim_failures = prohibited_claim_failures("\n".join(text_parts))
    blocking.extend(claim_failures)
    failures.extend(claim_failures)

    for text in text_parts:
        redaction = redact_pii(text, context="standard")
        if redaction.blocked or "exact_address" in redaction.findings:
            blocking.append("PII_DETECTED_IN_PACKET")
            failures.append("PII_DETECTED_IN_PACKET")
            break

    failures.extend(blocking)
    return ValidationReport(
        passed=not blocking,
        failures=sorted(set(failures)),
        blocking_failures=sorted(set(blocking)),
    ).to_dict()


def _walk_strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        values: list[str] = []
        for item in value.values():
            values.extend(_walk_strings(item))
        return values
    if isinstance(value, (list, tuple, set)):
        values = []
        for item in value:
            values.extend(_walk_strings(item))
        return values
    return [str(value)]
