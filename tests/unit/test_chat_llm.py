from app.services.chat_llm import _build_prompt


def test_llm_prompt_uses_structured_grounding_without_canned_message() -> None:
    prompt = _build_prompt(
        [{"role": "user", "content": "I am in San Jose and need food help."}],
        {"language": "en"},
        {
            "route": "packet_ready",
            "message": "I prepared source-backed directions for the benefit areas worth checking.",
            "events": ["chat_received", "deterministic_graph"],
            "next_questions": ["How many people are in the household?"],
            "snapshot": {"location_text": "San Jose, CA", "needs": ["food"]},
            "packet": {
                "potential_benefit_paths": [
                    {
                        "program_name": "Food help: CalFresh / SNAP",
                        "status_label": "likely_worth_checking",
                        "why_this_is_relevant": ["Food need was mentioned."],
                        "missing_facts": ["Household size"],
                        "source_citations": [
                            {
                                "source_id": "calfresh_state",
                                "source_title": "California CalFresh official site",
                            }
                        ],
                    }
                ],
                "source_citations": [
                    {
                        "source_id": "calfresh_state",
                        "source_title": "California CalFresh official site",
                    }
                ],
                "household_snapshot_summary": "Household in Santa Clara County.",
            },
            "resources": [],
        },
    )

    assert "I am in San Jose and need food help." in prompt
    assert "Food help: CalFresh / SNAP" in prompt
    assert "California CalFresh official site" in prompt
    assert "I prepared source-backed directions" not in prompt
    assert "deterministic_message" not in prompt
