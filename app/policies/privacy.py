"""Privacy and data-minimization rules for AidAtlasCA."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
DOB_RE = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"
)
EBT_OR_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,19}\b")
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")
CASE_NUMBER_RE = re.compile(
    r"\b(?:case|caso|worker)\s*(?:#|number|no\.?)?\s*[:\-]?\s*[A-Z0-9-]{5,}\b"
    r"|\bbenefitscal\s*(?:case|id|number|no\.?|#)\s*[:\-]?\s*[A-Z0-9-]{5,}\b",
    re.I,
)
CREDENTIAL_RE = re.compile(
    r"\b(?:password|passcode|pin|username|login)\s*[:=]\s*\S+", re.I
)
ADDRESS_RE = re.compile(
    r"\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+"
    r"(?:st|street|ave|avenue|rd|road|blvd|drive|dr|ln|lane|way|ct|court)\b",
    re.I,
)


@dataclass(slots=True)
class RedactionResult:
    redacted_text: str
    findings: list[str] = field(default_factory=list)
    blocked: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "redacted_text": self.redacted_text,
            "findings": self.findings,
            "blocked": self.blocked,
        }


PATTERNS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("ssn", SSN_RE, "[REDACTED_SSN]"),
    ("credential", CREDENTIAL_RE, "[REDACTED_CREDENTIAL]"),
    ("case_number", CASE_NUMBER_RE, "[REDACTED_CASE_NUMBER]"),
    ("email", EMAIL_RE, "[REDACTED_EMAIL]"),
    ("phone", PHONE_RE, "[REDACTED_PHONE]"),
    ("dob_or_date", DOB_RE, "[REDACTED_DATE]"),
    ("card_or_ebt", EBT_OR_CARD_RE, "[REDACTED_CARD]"),
    ("exact_address", ADDRESS_RE, "[REDACTED_ADDRESS]"),
)

BLOCKING_FINDINGS = {"ssn", "credential", "card_or_ebt", "case_number"}
SAFETY_CONTEXTS = {"dv", "stalking", "trafficking", "crisis", "homelessness", "youth"}


def redact_pii(text: str, context: str | None = None) -> RedactionResult:
    """Redact sensitive values and mark blocking findings for model/log safety."""

    redacted = text
    findings: list[str] = []
    for finding, pattern, replacement in PATTERNS:
        if pattern.search(redacted):
            redacted = pattern.sub(replacement, redacted)
            findings.append(finding)

    context_key = (context or "").lower()
    blocked = bool(BLOCKING_FINDINGS.intersection(findings))
    if "exact_address" in findings and context_key in SAFETY_CONTEXTS:
        blocked = True

    return RedactionResult(redacted_text=redacted, findings=findings, blocked=blocked)


def has_exact_address(text: str) -> bool:
    return bool(ADDRESS_RE.search(text))
