"""Packet translation boundary."""

from __future__ import annotations

from typing import Any


def translate_packet(
    packet: dict[str, Any],
    target_language: str = "es",
    glossary_version: str = "benefitbridge-es-mvp-2026-06-28",
) -> dict[str, object]:
    """Prepare a translated packet envelope.

    The scaffold records translation requirements without making unreviewed
    high-stakes language claims.
    """

    normalized_language = target_language.lower()
    if normalized_language == "en":
        return {
            "lang": "en",
            "review_status": "source_language",
            "requires_human_review": False,
            "caveats": [
                "English source packet still requires source citations and uncertainty."
            ],
            "content": packet,
        }
    if normalized_language != "es":
        return {
            "lang": normalized_language,
            "review_status": "machine_draft_unreviewed",
            "requires_human_review": True,
            "caveats": [
                "This language is draft-only until bilingual QA review.",
                "Do not treat machine-only translation as final benefits guidance.",
                "Source citations, uncertainty, and call-before-going notices must be preserved.",
            ],
            "content": packet,
        }
    return {
        "lang": "es",
        "review_status": "reviewed_template",
        "requires_human_review": False,
        "reviewed_template_version": glossary_version,
        "caveats": [
            "Spanish content must preserve source citations and uncertainty.",
            "Machine-only translations are draft-only until reviewed.",
        ],
        "content": packet,
    }
