"""PII redaction tool."""

from __future__ import annotations

from app.policies.privacy import redact_pii as _redact_pii


def redact_pii(text: str, context: str = "standard") -> dict[str, object]:
    """Detect and redact sensitive text before model calls, logs, or telemetry."""

    return _redact_pii(text, context=context).to_dict()
