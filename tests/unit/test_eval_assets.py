import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]


def test_statewide_expansion_eval_dataset_has_at_least_75_new_cases() -> None:
    path = (
        ROOT / "tests" / "eval" / "datasets" / "benefitbridge_statewide_expansion.json"
    )
    data = json.loads(path.read_text(encoding="utf-8"))
    cases = data["eval_cases"]

    assert len(cases) >= 75
    categories = {case["category"] for case in cases}
    assert {"red_team", "persona", "workflow"}.issubset(categories)
    assert all("prompt" in case for case in cases)
    assert all("must_not" in case for case in cases)


def test_eval_config_declares_new_local_hard_gates() -> None:
    config = yaml.safe_load(
        (ROOT / "tests" / "eval" / "eval_config.yaml").read_text(encoding="utf-8")
    )

    metrics = set(config["metrics_to_run"])
    assert {
        "benefitbridge_privacy_pii_gate",
        "benefitbridge_local_availability_gate",
        "benefitbridge_language_scope_gate",
        "benefitbridge_packet_shape_gate",
        "benefitbridge_a2ui_contract_gate",
        "benefitbridge_graph_trace_gate",
    }.issubset(metrics)


def test_bdd_feature_file_contains_50_or_more_scenarios() -> None:
    path = ROOT / "specs" / "benefitbridge_statewide_enhancements.feature"
    text = path.read_text(encoding="utf-8")

    assert text.count("\n  Scenario:") >= 50
    assert "Call before going to confirm current availability." in text
