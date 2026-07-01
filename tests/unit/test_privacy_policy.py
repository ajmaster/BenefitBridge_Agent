from app.policies.privacy import redact_pii


def test_redacts_and_blocks_ssn() -> None:
    result = redact_pii("My SSN is 123-45-6789", context="standard")

    assert result.blocked is True
    assert "ssn" in result.findings
    assert "123-45-6789" not in result.redacted_text


def test_exact_address_blocks_in_safety_context() -> None:
    result = redact_pii("I am at 70 W Hedding St", context="dv")

    assert result.blocked is True
    assert "exact_address" in result.findings


def test_benefitscal_source_copy_is_not_case_number() -> None:
    result = redact_pii("BenefitsCal information site", context="standard")

    assert "case_number" not in result.findings
    assert result.blocked is False
