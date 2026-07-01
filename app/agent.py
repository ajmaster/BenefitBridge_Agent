"""ADK entrypoint for the BenefitBridge CA prototype."""

from __future__ import annotations

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.callbacks import (
    after_tool_callback,
    before_agent_callback,
    before_tool_callback,
)
from app.config import GEMINI_MODEL, prompt_text
from app.tools import BENEFITBRIDGE_TOOLS

root_agent = Agent(
    name="benefitbridge_agent",
    model=Gemini(
        model=GEMINI_MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description=(
        "California benefits preparation and local handoff assistant for "
        "Santa Clara County, San Jose, and San Francisco."
    ),
    instruction=prompt_text("root_agent.md"),
    tools=BENEFITBRIDGE_TOOLS,
    before_agent_callback=before_agent_callback,
    before_tool_callback=before_tool_callback,
    after_tool_callback=after_tool_callback,
)


app = App(root_agent=root_agent, name="app")
