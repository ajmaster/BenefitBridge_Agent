"""Deterministic packet construction for fixture-backed demo flows."""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterable

from app.schemas import BenefitPath, HouseholdSnapshot, PrepPacket, SourceCitation

SAFETY_NOTICE_EN = (
    "BenefitBridge helps you prepare. Official agencies decide eligibility and "
    "benefit amounts. Do not upload SSNs or sensitive documents in this demo. "
    "Local resources can change. Call before going."
)


def _unique_citations(paths: Iterable[BenefitPath]) -> list[SourceCitation]:
    by_id: dict[str, SourceCitation] = {}
    for path in paths:
        for citation in path.source_citations:
            by_id.setdefault(citation.source_id, citation)
    return list(by_id.values())


def build_prep_packet(
    snapshot: HouseholdSnapshot,
    benefit_paths: list[BenefitPath],
    *,
    immediate_help_notes: list[str] | None = None,
) -> PrepPacket:
    missing = []
    documents = []
    for path in benefit_paths:
        missing.extend(path.missing_facts)
        documents.extend(path.documents_to_prepare)

    county = (
        snapshot.location.get("county") or snapshot.location.get("city") or "unknown"
    )
    summary = (
        f"Household in {county}; language={snapshot.language}; "
        f"needs={', '.join(snapshot.needs) if snapshot.needs else 'not specified'}."
    )

    questions = [
        "Which benefit or local help should I start with based on my situation?",
        "Can I start an official application if I do not have every document yet?",
        "Which documents are helpful but optional for the first conversation?",
        "Can I receive help in my preferred language?",
        "What should I call before visiting in person?",
    ]
    call_script = (
        "Hello, I am preparing to ask about benefits or local help. "
        "I can share my county/city, household size, and current needs. "
        "Please tell me which official application or office is the right next step."
    )

    return PrepPacket(
        household_snapshot_summary=summary,
        potential_benefit_paths=benefit_paths,
        missing_answers=sorted(set(missing)),
        document_checklist=sorted(set(documents)),
        caseworker_questions=questions,
        call_script=call_script,
        safety_notice=SAFETY_NOTICE_EN,
        source_citations=_unique_citations(benefit_paths),
        user_language=snapshot.language,
        immediate_help_notes=immediate_help_notes or [],
        generated_at=dt.datetime.now(dt.UTC).isoformat(),
    )
