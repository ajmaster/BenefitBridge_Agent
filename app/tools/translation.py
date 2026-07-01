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

    if target_language != "es":
        return {
            "error": {
                "code": "LANGUAGE_NOT_SUPPORTED",
                "message": "MVP reviewed output is English and Spanish only.",
                "blocking": False,
            }
        }
    return {
        "lang": "es",
        "reviewed_template_version": glossary_version,
        "caveats": [
            "Spanish content must preserve source citations and uncertainty.",
            "Machine-only translations are draft-only until reviewed.",
        ],
        "content": packet,
    }
