"""Source grounding and prohibited-claim validation."""

from __future__ import annotations

from urllib.parse import urlparse

from app.schemas import PrepPacket, ValidationReport

PROHIBITED_PHRASES = (
    "you qualify",
    "you are eligible",
    "you are approved",
    "guaranteed",
    "you will receive $",
    "we submitted your application",
    "upload your ssn",
    "this shelter has a bed available",
)


def url_domain(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def validate_url_allowlist(urls: list[str], approved_domains: set[str]) -> list[str]:
    failures: list[str] = []
    normalized_domains = {
        domain[4:] if domain.startswith("www.") else domain
        for domain in approved_domains
    }
    for url in urls:
        domain = url_domain(url)
        if domain and domain not in normalized_domains:
            failures.append(f"INVENTED_URL:{url}")
    return failures


def prohibited_claim_failures(text: str) -> list[str]:
    lowered = text.lower()
    return [
        f"PROHIBITED_CLAIM:{phrase}"
        for phrase in PROHIBITED_PHRASES
        if phrase in lowered
    ]


def validate_packet_grounding(
    packet: PrepPacket, approved_domains: set[str]
) -> ValidationReport:
    failures: list[str] = []
    blocking: list[str] = []

    if not packet.potential_benefit_paths:
        failures.append("NO_BENEFIT_PATHS")

    all_urls: list[str] = []
    all_text_parts = [
        packet.household_snapshot_summary,
        packet.call_script,
        packet.safety_notice,
        *packet.missing_answers,
        *packet.document_checklist,
        *packet.caseworker_questions,
    ]

    for path in packet.potential_benefit_paths:
        if not path.source_citations:
            blocking.append(f"CITATION_MISSING:{path.program_name}")
        for citation in path.source_citations:
            all_urls.append(citation.url)
        all_text_parts.extend(path.why_this_is_relevant)
        all_text_parts.extend(path.warnings)

    for citation in packet.source_citations:
        all_urls.append(citation.url)

    url_failures = validate_url_allowlist(all_urls, approved_domains)
    failures.extend(url_failures)
    blocking.extend(url_failures)

    claim_failures = prohibited_claim_failures("\n".join(all_text_parts))
    failures.extend(claim_failures)
    blocking.extend(claim_failures)

    return ValidationReport(
        passed=not blocking,
        failures=failures,
        blocking_failures=blocking,
    )
