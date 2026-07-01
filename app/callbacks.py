"""ADK callback guardrails for the BenefitBridge harness."""

from __future__ import annotations

from typing import Any

from app.policies.privacy import has_exact_address, redact_pii
from app.tools.validation import validate_packet


def before_agent_callback(callback_context: Any) -> None:
    """Reserved hook for privacy-before-logging policy.

    ADK passes the documented `callback_context` keyword. The deterministic
    graph performs concrete redaction; this hook remains the global guardrail
    attachment point for future telemetry integrations.
    """

    return None


def before_tool_callback(
    tool: Any, args: dict[str, Any], tool_context: Any
) -> dict[str, Any] | None:
    """Block unsafe tool arguments before execution."""

    tool_name = getattr(tool, "name", "")
    for value in _walk_strings(args):
        redaction = redact_pii(value, context="standard")
        if redaction.blocked:
            return {
                "error": {
                    "code": "PII_BLOCKED",
                    "message": "Sensitive values cannot be sent to tools.",
                    "blocking": True,
                    "findings": redaction.findings,
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
