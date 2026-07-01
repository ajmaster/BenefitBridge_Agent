from app.graph import run_benefitbridge_graph


def test_graph_order_privacy_safety_jurisdiction_critic_export() -> None:
    result = run_benefitbridge_graph(
        "I need food today in San Jose.",
        {
            "language": "en",
            "location_text": "San Jose, CA",
            "household_size": 1,
            "needs": ["food today"],
            "food_need_today": True,
        },
    )

    events = result["events"]
    assert events.index("consent_privacy") < events.index("safety_triage")
    assert events.index("safety_triage") < events.index("jurisdiction")
    assert events.index("jurisdiction") < events.index("benefit_path_matcher")
    assert events.index("safety_and_grounding_critic") < events.index(
        "export_prep_packet"
    )


def test_crisis_route_suppresses_normal_packet() -> None:
    result = run_benefitbridge_graph(
        "I might hurt myself and also need benefits.",
        {
            "language": "en",
            "location_text": "San Jose, CA",
            "needs": ["food"],
        },
    )

    assert result["route"] == "crisis_handoff"
    assert "packet" not in result
