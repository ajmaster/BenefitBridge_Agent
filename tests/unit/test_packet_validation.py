from app.graph import run_benefitbridge_graph
from app.policies.source_grounding import validate_url_allowlist
from app.tools.validation import validate_packet
from scripts.prohibited_copy_scan import scan_paths, scan_text


def _blocking_failures(report: dict[str, object]) -> list[str]:
    failures = report["blocking_failures"]
    assert isinstance(failures, list)
    return [str(item) for item in failures]


def test_validate_packet_blocks_prohibited_claim() -> None:
    packet = {
        "household_snapshot_summary": "San Jose household",
        "potential_benefit_paths": [
            {
                "program_name": "CalFresh",
                "status_label": "likely_worth_checking",
                "source_citations": [
                    {
                        "source_id": "cdss_calfresh_home",
                        "url": "https://calfresh.dss.ca.gov/",
                    }
                ],
                "warnings": ["You qualify for CalFresh."],
            }
        ],
        "missing_answers": [],
        "document_checklist": [],
        "caseworker_questions": [],
        "call_script": "",
        "safety_notice": "",
        "source_citations": [],
    }

    report = validate_packet(packet)

    assert report["pass"] is False
    assert any("PROHIBITED_CLAIM" in item for item in _blocking_failures(report))


def test_graph_returns_valid_packet_for_san_jose_food_health() -> None:
    result = run_benefitbridge_graph(
        "I lost work hours and need food and health coverage.",
        {
            "language": "en",
            "location_text": "San Jose, CA 95112",
            "household_size": 3,
            "needs": ["food", "health coverage"],
        },
    )

    assert result["route"] == "standard_benefits_prep"
    assert result["validation"]["pass"] is True
    assert result["packet"]["potential_benefit_paths"]


def test_validate_packet_blocks_root_pii() -> None:
    packet = {
        "household_snapshot_summary": "The user is at 70 W Hedding St, San Jose.",
        "potential_benefit_paths": [],
        "missing_answers": [],
        "document_checklist": [],
        "caseworker_questions": [],
        "call_script": "",
        "safety_notice": "",
        "source_citations": [],
    }

    report = validate_packet(packet)

    assert report["pass"] is False
    assert "PII_DETECTED_IN_PACKET" in _blocking_failures(report)


def test_validate_packet_blocks_invented_official_link() -> None:
    packet = {
        "household_snapshot_summary": "San Jose household",
        "potential_benefit_paths": [
            {
                "program_name": "CalFresh",
                "status_label": "likely_worth_checking",
                "source_citations": [
                    {
                        "source_id": "cdss_calfresh_home",
                        "url": "https://calfresh.dss.ca.gov/",
                    }
                ],
                "official_links": ["https://apply-benefits-free.example.com"],
                "warnings": [],
            }
        ],
        "missing_answers": [],
        "document_checklist": [],
        "caseworker_questions": [],
        "call_script": "",
        "safety_notice": "",
        "source_citations": [],
    }

    report = validate_packet(packet)

    assert report["pass"] is False
    assert any("INVENTED_URL" in item for item in _blocking_failures(report))


def test_url_allowlist_normalizes_www() -> None:
    failures = validate_url_allowlist(
        ["https://www.getcalfresh.org/en/apply"],
        {"getcalfresh.org"},
    )

    assert failures == []


def test_copy_scanner_flags_prohibited_marketing_and_safety_claims() -> None:
    findings = scan_text(
        "You are eligible. We can apply for you. "
        "Upload your ID. You will receive $500. "
        "The pantry has food available right now. "
        "BenefitBridge serves the whole Bay Area.",
        source="sample",
    )

    finding_ids = {finding["id"] for finding in findings}
    assert {
        "eligibility_decision",
        "application_submission",
        "real_document_upload",
        "benefit_amount_prediction",
        "live_food_availability",
        "whole_bay_area_coverage",
    }.issubset(finding_ids)


def test_rendered_frontend_copy_has_no_prohibited_claims() -> None:
    findings = scan_paths(["frontend/out"])

    assert findings == []
