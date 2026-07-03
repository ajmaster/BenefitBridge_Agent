import pytest

from app.services.a2ui_contract import (
    ALLOWED_A2UI_ACTION_TYPES,
    ALLOWED_A2UI_TEMPLATE_TYPES,
    a2ui_readiness_summary,
    validate_a2ui_templates,
)
from app.services.chat_workflow import run_chat_workflow


def test_chat_workflow_emits_validated_a2ui_templates() -> None:
    result = run_chat_workflow(
        [
            {
                "role": "user",
                "content": (
                    "I am in San Jose with 3 people and need food, Medi-Cal, "
                    "phone discount, and child care help."
                ),
            }
        ],
        {"language": "en"},
    )

    assert result["route"] == "packet_ready"
    assert validate_a2ui_templates(result["ui_templates"]) == result["ui_templates"]

    template_types = {template["type"] for template in result["ui_templates"]}
    assert "progress" in template_types
    assert "call_script" in template_types
    assert "source_sheet" in template_types

    action_types = {
        action["type"]
        for template in result["ui_templates"]
        for action in template.get("actions", [])
    }
    assert {"open_packet", "open_sources", "copy_call_script"}.issubset(action_types)


def test_a2ui_contract_rejects_unknown_actions() -> None:
    template = {
        "id": "unsafe",
        "type": "fact_summary",
        "title": "Unsafe action",
        "tone": "info",
        "items": [],
        "actions": [{"type": "submit_application", "label": "Apply now"}],
        "citations": [],
    }

    with pytest.raises(ValueError, match="submit_application"):
        validate_a2ui_templates([template])


def test_a2ui_readiness_summary_lists_contract_surface() -> None:
    summary = a2ui_readiness_summary()

    assert summary["valid"] is True
    assert set(summary["template_types"]) == ALLOWED_A2UI_TEMPLATE_TYPES
    assert set(summary["action_types"]) == ALLOWED_A2UI_ACTION_TYPES
    assert summary["mime_type"] == "application/json+a2ui"
