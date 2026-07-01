from types import SimpleNamespace

from app.callbacks import before_tool_callback


def test_before_tool_callback_blocks_nested_sensitive_args() -> None:
    response = before_tool_callback(
        SimpleNamespace(name="match_benefit_paths"),
        {"packet": {"notes": ["Use SSN 123-45-6789 in the form."]}},
        tool_context=None,
    )

    assert response is not None
    assert response["error"]["code"] == "PII_BLOCKED"


def test_before_tool_callback_blocks_nested_exact_address_for_non_lookup_tool() -> None:
    response = before_tool_callback(
        SimpleNamespace(name="find_local_resources"),
        {"query": {"location": "70 W Hedding St, San Jose, CA"}},
        tool_context=None,
    )

    assert response is not None
    assert response["error"]["code"] == "EXACT_ADDRESS_BLOCKED"
