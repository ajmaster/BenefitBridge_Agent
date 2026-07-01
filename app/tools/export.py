"""Session-only prep packet export helpers."""

from __future__ import annotations

import json
from typing import Any

from app.tools.validation import validate_packet


def export_packet(
    packet: dict[str, Any],
    formats: list[str] | None = None,
) -> dict[str, object]:
    """Export packet artifacts without submitting applications or storing PII."""

    formats = formats or ["html", "json", "md"]
    validation = validate_packet(packet)
    if not validation["pass"]:
        return {
            "error": {
                "code": "SAFETY_BLOCK",
                "message": "Packet failed validation and cannot be exported.",
                "blocking_failures": validation["blocking_failures"],
            }
        }

    artifacts = []
    if "json" in formats:
        artifacts.append(
            {
                "format": "json",
                "content": json.dumps(packet, indent=2, sort_keys=True),
                "storage": "session_only",
            }
        )
    if "md" in formats:
        artifacts.append(
            {
                "format": "md",
                "content": _packet_markdown(packet),
                "storage": "session_only",
            }
        )
    if "html" in formats:
        artifacts.append(
            {
                "format": "html",
                "content": f"<main><pre>{_escape(_packet_markdown(packet))}</pre></main>",
                "storage": "session_only",
            }
        )
    if "pdf" in formats:
        artifacts.append(
            {
                "format": "pdf",
                "content": "PDF export placeholder; render from printable HTML in implementation.",
                "storage": "session_only",
            }
        )

    return {
        "artifacts": artifacts,
        "source_citations_json": packet.get("source_citations", []),
        "validation": validation,
    }


def _packet_markdown(packet: dict[str, Any]) -> str:
    lines = [
        "# BenefitBridge CA Prep Packet",
        "",
        packet.get("safety_notice", ""),
        "",
        "## Household Snapshot",
        packet.get("household_snapshot_summary", ""),
        "",
        "## Potential Benefit Paths",
    ]
    for path in packet.get("potential_benefit_paths", []):
        lines.extend(
            [
                f"### {path.get('program_name', 'Benefit path')}",
                f"Status: {path.get('status_label', 'unknown')}",
                "",
            ]
        )
    return "\n".join(lines)


def _escape(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
