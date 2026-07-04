import os
from collections.abc import AsyncGenerator
from typing import Any

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini, LlmResponse
from google.genai import types

from app.callbacks import (
    after_model_callback,
    after_tool_callback,
    before_agent_callback,
    before_tool_callback,
)
from app.config import GEMINI_MODEL, prompt_text
from app.tools import BENEFITBRIDGE_TOOLS


class MockGemini(Gemini):
    async def generate_content_async(
        self, llm_request: Any, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        text = "This is a local mock Gemini response via ADK."
        for content in getattr(llm_request, "contents", []):
            for part in getattr(content, "parts", []):
                part_text = getattr(part, "text", "")
                if "deterministic_message" in part_text:
                    try:
                        idx = part_text.find('"deterministic_message": "')
                        if idx != -1:
                            start = idx + len('"deterministic_message": "')
                            end = part_text.find('", "', start)
                            if end == -1:
                                end = part_text.find('"}', start)
                            if end != -1:
                                text = (
                                    part_text[start:end]
                                    .replace('\\"', '"')
                                    .replace("\\n", "\n")
                                )
                    except Exception:
                        pass

        mock_content = types.Content(
            role="model", parts=[types.Part.from_text(text=text)]
        )
        yield LlmResponse(
            content=mock_content,
            partial=False,
            turn_complete=True,
        )


def _should_use_mock_model() -> bool:
    if os.getenv("ACLI_EVAL_MOCK", "false").lower() == "true":
        return True
    if os.getenv("ENABLE_LLM_CHAT", "true").lower() == "false":
        return True
    if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true":
        if not os.getenv("GOOGLE_CLOUD_PROJECT"):
            return True
    else:
        if not (
            os.getenv("GOOGLE_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
        ):
            return True
    return False


model_instance = (
    MockGemini(
        model=GEMINI_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    )
    if _should_use_mock_model()
    else Gemini(
        model=GEMINI_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    )
)


root_agent = Agent(
    name="aidatlasca_agent",
    model=model_instance,
    description=(
        "California benefits preparation and local handoff assistant with "
        "reviewed local depth in selected Bay Area counties and statewide "
        "core locator handoffs for all 58 California counties."
    ),
    instruction=prompt_text("root_agent.md"),
    tools=BENEFITBRIDGE_TOOLS,
    before_agent_callback=before_agent_callback,
    after_model_callback=after_model_callback,
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
)


app = App(root_agent=root_agent, name="app")
