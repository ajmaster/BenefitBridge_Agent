from fastapi.testclient import TestClient

from app.fast_api_app import app
from app.graph import run_benefitbridge_graph

client = TestClient(app)


def _valid_packet() -> dict:
    result = run_benefitbridge_graph(
        "I need food and health coverage in San Jose.",
        {
            "language": "en",
            "location_text": "San Jose, CA",
            "household_size": 2,
            "needs": ["food", "health coverage"],
        },
    )
    return result["packet"]


def test_healthz() -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_prepare_returns_packet_for_synthetic_profile() -> None:
    response = client.post(
        "/api/prepare",
        json={
            "user_text": "I lost hours and need food in San Jose.",
            "snapshot": {
                "language": "en",
                "location_text": "San Jose, CA",
                "household_size": 3,
                "needs": ["food"],
            },
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "standard_benefits_prep"
    assert body["validation"]["pass"] is True


def test_prepare_supports_representative_bay_area_city() -> None:
    response = client.post(
        "/api/prepare",
        json={
            "user_text": "I need food help in Oakland.",
            "snapshot": {
                "language": "en",
                "location_text": "Oakland, CA",
                "household_size": 2,
                "needs": ["food"],
            },
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "standard_benefits_prep"
    assert body["jurisdiction"]["county"] == "Alameda County"
    assert body["jurisdiction"]["fips"] == "06001"
    assert body["validation"]["pass"] is True


def test_prepare_blocks_ssn_before_graph() -> None:
    response = client.post(
        "/api/prepare",
        json={
            "user_text": "My SSN is 123-45-6789 and I need CalFresh.",
            "snapshot": {"language": "en", "location_text": "San Jose, CA"},
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "privacy_block"
    assert body["redaction"]["blocked"] is True
    assert "123-45-6789" not in str(body)


def test_chat_returns_a2ui_templates_and_packet() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "I am in San Jose with 3 people and need food, "
                        "health coverage, and utility help."
                    ),
                }
            ],
            "snapshot": {"language": "en"},
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "packet_ready"
    assert body["packet"]["potential_benefit_paths"]
    assert body["resources"]
    assert body["validation"]["pass"] is True

    template_types = {template["type"] for template in body["ui_templates"]}
    assert {
        "benefit_paths",
        "local_resources",
        "source_links",
        "packet_summary",
    }.issubset(template_types)
    assert any(
        item["links"]
        for template in body["ui_templates"]
        if template["type"] == "benefit_paths"
        for item in template["items"]
    )


def test_chat_blocks_ssn_before_fact_collection() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "My SSN is 123-45-6789 and I need CalFresh.",
                }
            ],
            "snapshot": {"language": "en", "location_text": "San Jose, CA"},
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "privacy_block"
    assert body["redaction"]["blocked"] is True
    assert "123-45-6789" not in str(body)


def test_chat_treats_generic_bay_area_as_too_broad() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "I am in the Bay Area and need food help.",
                }
            ],
            "snapshot": {"language": "en"},
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "intake"
    assert body["snapshot"].get("location_text") in (None, "")
    assert any("city, county, or ZIP" in question for question in body["next_questions"])


def test_chat_blocks_exact_address_from_current_message() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "I am at 70 W Hedding St in San Jose and need food near me.",
                }
            ],
            "snapshot": {"language": "en"},
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "privacy_block"
    assert body["redaction"]["blocked"] is True
    assert "exact_address" in body["redaction"]["findings"]
    assert "70 W Hedding" not in str(body)


def test_chat_blocks_exact_address_from_snapshot() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "I need food help."}],
            "snapshot": {
                "language": "en",
                "location_text": "70 W Hedding St, San Jose, CA",
                "household_size": 1,
                "needs": ["food"],
            },
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "privacy_block"
    assert body["redaction"]["blocked"] is True
    assert "exact_address" in body["redaction"]["findings"]
    assert "70 W Hedding" not in str(body)


def test_export_blocks_packet_with_sensitive_text() -> None:
    packet = _valid_packet()
    packet["household_snapshot_summary"] = "Use case number BenefitsCal ABC12345."

    response = client.post(
        "/api/export",
        json={"packet": packet, "formats": ["json"]},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PII_DETECTED_IN_PACKET"


def test_resources_blocks_exact_address_query() -> None:
    response = client.get(
        "/api/resources",
        params={
            "jurisdiction": "70 W Hedding St, San Jose, CA",
            "need_type": "food",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PII_DETECTED_IN_RESOURCE_QUERY"


def test_resources_return_map_safe_queries_without_user_origin() -> None:
    response = client.get(
        "/api/resources",
        params={
            "jurisdiction": "San Jose, CA",
            "need_type": "food",
            "language": "en",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert body["resources"]

    for resource in body["resources"]:
        assert resource["map_query"]
        assert resource["maps_url"].startswith(
            "https://www.google.com/maps/search/?api=1&query="
        )
        assert "70 W Hedding" not in resource["map_query"]
        assert "near me" not in resource["map_query"].lower()


def test_readiness_reports_existing_out_of_range_eval_artifact() -> None:
    response = client.get("/api/eval/readiness")

    body = response.json()
    assert response.status_code == 200
    assert "latest_grade_summary" in body["evals"]
    assert body["release_gates"]["ready_for_public_deploy"] is False
