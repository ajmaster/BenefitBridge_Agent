from app.services.chat_workflow import run_chat_workflow


def test_chat_workflow_returns_source_backed_a2ui_packet() -> None:
    result = run_chat_workflow(
        [
            {
                "role": "user",
                "content": (
                    "I am in San Jose with 3 people and need food, health "
                    "coverage, and utility help."
                ),
            }
        ],
        {"language": "en"},
    )

    assert result["route"] == "packet_ready"
    assert result["packet"]["potential_benefit_paths"]
    assert result["resources"]
    assert result["validation"]["pass"] is True

    template_types = {template["type"] for template in result["ui_templates"]}
    assert {
        "fact_summary",
        "benefit_paths",
        "local_resources",
        "source_links",
        "packet_summary",
    }.issubset(template_types)

    benefit_template = next(
        template
        for template in result["ui_templates"]
        if template["type"] == "benefit_paths"
    )
    assert benefit_template["citations"]
    assert any(item["links"] for item in benefit_template["items"])

    resources_template = next(
        template
        for template in result["ui_templates"]
        if template["type"] == "local_resources"
    )
    assert "Call before going" in resources_template["body"]


def test_chat_workflow_collects_missing_facts_before_packet() -> None:
    result = run_chat_workflow(
        [{"role": "user", "content": "Hi, I need help."}],
        {"language": "en"},
    )

    assert result["route"] == "intake"
    assert "packet" not in result
    assert result["next_questions"]
    assert any(
        template["type"] == "question_set" for template in result["ui_templates"]
    )


def test_chat_workflow_latest_location_updates_prefilled_snapshot() -> None:
    result = run_chat_workflow(
        [
            {
                "role": "user",
                "content": "I am in San Francisco and need food and shelter tonight.",
            }
        ],
        {
            "language": "en",
            "location_text": "San Jose, CA",
            "household_size": 1,
            "adults": 1,
            "needs": ["food"],
        },
    )

    assert result["snapshot"]["location_text"] == "San Francisco, CA"
    assert "shelter" in result["snapshot"]["needs"]
    assert result["jurisdiction"]["county"] == "San Francisco County"


def test_chat_workflow_blocks_sensitive_details() -> None:
    result = run_chat_workflow(
        [
            {
                "role": "user",
                "content": "My SSN is 123-45-6789 and I need CalFresh.",
            }
        ],
        {"language": "en", "location_text": "San Jose, CA"},
    )

    assert result["route"] == "privacy_block"
    assert result["redaction"]["blocked"] is True
    assert "123-45-6789" not in str(result)
    assert any(
        template["type"] == "privacy_notice" for template in result["ui_templates"]
    )


def test_chat_workflow_blocks_exact_address_from_current_message() -> None:
    result = run_chat_workflow(
        [
            {
                "role": "user",
                "content": "I am at 70 W Hedding St in San Jose and need food near me.",
            }
        ],
        {"language": "en"},
    )

    assert result["route"] == "privacy_block"
    assert result["redaction"]["blocked"] is True
    assert "exact_address" in result["redaction"]["findings"]
    assert "70 W Hedding" not in str(result)
    assert "packet" not in result


def test_chat_workflow_blocks_exact_address_from_snapshot() -> None:
    result = run_chat_workflow(
        [{"role": "user", "content": "I need food help."}],
        {
            "language": "en",
            "location_text": "70 W Hedding St, San Jose, CA",
            "household_size": 1,
            "needs": ["food"],
        },
    )

    assert result["route"] == "privacy_block"
    assert result["redaction"]["blocked"] is True
    assert "exact_address" in result["redaction"]["findings"]
    assert "70 W Hedding" not in str(result)
    assert "packet" not in result


def test_chat_workflow_treats_bay_area_as_ambiguous_location() -> None:
    result = run_chat_workflow(
        [{"role": "user", "content": "I am somewhere in the Bay Area and need food."}],
        {"language": "en"},
    )

    assert result["route"] == "intake"
    assert not result["snapshot"]["location_text"]
    assert any("city, county, or ZIP" in question for question in result["next_questions"])
