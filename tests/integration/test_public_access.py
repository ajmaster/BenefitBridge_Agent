from fastapi.testclient import TestClient

from app.fast_api_app import app

client = TestClient(app)


def test_readiness_is_public() -> None:
    response = client.get("/api/eval/readiness")

    assert response.status_code == 200
    assert response.json()["app"]["name"] == "aidatlasca"


def test_chat_is_public_without_account_headers() -> None:
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "I am in San Jose and need food help.",
                }
            ],
            "snapshot": {"language": "en"},
        },
    )

    assert response.status_code == 200
    assert response.json()["route"] in {"packet_ready", "intake", "source_answer"}
