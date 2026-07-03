"""ADK callback guardrails for the AidAtlasCA harness."""

from __future__ import annotations

import re
from typing import Any

from google.adk.models.llm_response import LlmResponse
from google.genai import types

from app.policies.privacy import has_exact_address
from app.services.google_integrations import detect_sensitive_text, screen_model_text
from app.tools.validation import validate_packet

_SAFETY_FOOTER = (
    "Official agencies decide eligibility and current rules. Call before going."
)
_FOOTER_TRIGGER_TERMS = (
    "application",
    "benefit",
    "calfresh",
    "calworks",
    "covered california",
    "directions",
    "food",
    "handoff",
    "housing",
    "legal-aid",
    "liheap",
    "local resource",
    "map",
    "medi-cal",
    "office",
    "route",
    "shelter",
    "wic",
)
_BROAD_BAY_AREA_RE = re.compile(
    r"\b(?:serves|covers)\s+(?:the\s+)?"
    r"(?:whole|entire|all(?:\s+of)?(?:\s+the)?)\s+Bay Area\b",
    re.IGNORECASE,
)
_STALE_LOCAL_COVERAGE_RE = re.compile(
    r"\b(?:my\s+)?local\s+coverage\s+is\s+limited\s+to\s+"
    r"source-backed\s+jurisdictions\s+in\s+Santa\s+Clara\s+County,\s+"
    r"San\s+Jose,\s+and\s+San\s+Francisco\.?",
    re.IGNORECASE,
)


def before_agent_callback(callback_context: Any) -> None:
    """Reserved hook for privacy-before-logging policy.

    ADK passes the documented `callback_context` keyword. The deterministic
    graph performs concrete redaction; this hook remains the global guardrail
    attachment point for future telemetry integrations.
    """

    return None


def after_model_callback(
    callback_context: Any, llm_response: LlmResponse
) -> LlmResponse | None:
    """Normalize model text for mandatory safety and grounding language."""

    content = llm_response.content
    if content is None or not content.parts:
        return None

    changed = False
    parts: list[types.Part] = []
    for part in content.parts:
        if not part.text:
            parts.append(part)
            continue
        sanitized_text = _sanitize_model_response_text(part.text)
        if sanitized_text != part.text:
            changed = True
            parts.append(part.model_copy(update={"text": sanitized_text}))
        else:
            parts.append(part)

    if not changed:
        return None
    return llm_response.model_copy(
        update={"content": content.model_copy(update={"parts": parts})}
    )


def before_tool_callback(
    tool: Any, args: dict[str, Any], tool_context: Any
) -> dict[str, Any] | None:
    """Block unsafe tool arguments before execution."""

    tool_name = getattr(tool, "name", "")
    for value in _walk_strings(args):
        scan = detect_sensitive_text(value, context="standard")
        if scan["blocked"]:
            return {
                "error": {
                    "code": "PII_BLOCKED",
                    "message": "Sensitive values cannot be sent to tools.",
                    "blocking": True,
                    "findings": scan["findings"],
                    "finding_counts": scan.get("finding_counts", {}),
                }
            }
        if has_exact_address(value) and tool_name != "lookup_county_from_location":
            return {
                "error": {
                    "code": "EXACT_ADDRESS_BLOCKED",
                    "message": "Exact addresses are session-only and not needed for benefits prep.",
                    "blocking": True,
                }
            }
        model_armor = screen_model_text(value, stage="tool_input")
        if model_armor["blocked"]:
            return {
                "error": {
                    "code": "MODEL_ARMOR_BLOCKED",
                    "message": "Tool input was blocked by configured guardrails.",
                    "blocking": True,
                    "findings": model_armor["findings"],
                }
            }
    return None


def after_tool_callback(
    tool: Any,
    args: dict[str, Any],
    tool_context: Any,
    tool_response: dict[str, Any],
) -> dict[str, Any] | None:
    """Normalize packet validation after export-like tool results."""

    tool_name = getattr(tool, "name", "")
    if tool_name == "export_packet" and isinstance(tool_response, dict):
        packet = args.get("packet")
        if isinstance(packet, dict):
            validation = validate_packet(packet)
            if not validation["pass"]:
                return {
                    "error": {
                        "code": "SAFETY_BLOCK",
                        "message": "Packet export blocked by validation.",
                        "blocking_failures": validation["blocking_failures"],
                    }
                }
    return None


def _sanitize_model_response_text(text: str) -> str:
    sanitized = _BROAD_BAY_AREA_RE.sub("has broad regional coverage", text)
    sanitized = _STALE_LOCAL_COVERAGE_RE.sub(
        (
            "Local coverage is source-backed statewide: reviewed local depth "
            "where available and statewide locator handoffs elsewhere."
        ),
        sanitized,
    )
    sanitized = re.sub(
        r"\b[Tt]o find out if you are eligible\b",
        "For a program review",
        sanitized,
    )
    sanitized = re.sub(
        r"\b[Ii]f you are eligible\b",
        "If the program may fit your situation",
        sanitized,
    )
    sanitized = re.sub(
        r"\b[Yy]ou are eligible\b",
        "The program may fit your situation",
        sanitized,
    )
    sanitized = re.sub(
        r"\b[Tt]o be eligible\b",
        "For program review",
        sanitized,
    )
    sanitized = re.sub(
        r"https?://thehotline\.org[.,;:!?]+",
        "https://thehotline.org",
        sanitized,
    )
    sanitized = re.sub(
        r"https?://(?:www\.)?cpedv\.org/\S+",
        "the National Domestic Violence Hotline",
        sanitized,
    )
    return _append_safety_footer_if_needed(sanitized)


def _append_safety_footer_if_needed(text: str) -> str:
    lowered = text.lower()
    if not any(term in lowered for term in _FOOTER_TRIGGER_TERMS):
        return text

    missing_official = (
        "official agencies decide eligibility and current rules" not in lowered
    )
    missing_call = "call before going" not in lowered
    if not missing_official and not missing_call:
        return text
    if missing_official and missing_call:
        return f"{text.rstrip()}\n\n{_SAFETY_FOOTER}"

    footer_parts: list[str] = []
    if missing_official:
        footer_parts.append("Official agencies decide eligibility and current rules.")
    if missing_call:
        footer_parts.append("Call before going.")
    return f"{text.rstrip()}\n\n{' '.join(footer_parts)}"


def _walk_strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        strings: list[str] = []
        for item in value.values():
            strings.extend(_walk_strings(item))
        return strings
    if isinstance(value, (list, tuple, set)):
        strings = []
        for item in value:
            strings.extend(_walk_strings(item))
        return strings
    return [str(value)]
