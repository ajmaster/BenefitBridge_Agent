# ADK Graph Workflow

BenefitBridge uses a deterministic graph wrapped by an ADK root agent.

The runtime order is:

1. Consent and privacy screen.
2. Language detection and preference capture.
3. Safety triage for crisis, domestic violence, urgent shelter, and urgent food.
4. Jurisdiction routing by city, ZIP, or county.
5. Household snapshot normalization.
6. Need-to-program matching.
7. Approved source retrieval.
8. Benefit path preparation.
9. Missing-facts and document checklist generation.
10. Local handoff and call-before-going rules.
11. Final critic validation.
12. Translation and export.
13. Privacy-safe telemetry summary.

The ADK `root_agent` exposes tools for demo and eval interaction, but the
deterministic `run_benefitbridge_graph` function is the reproducible contract
for tests and future UI/API adapters.

Callback requirements:

- `before_agent_callback(callback_context)` sets guardrail state.
- `before_tool_callback(tool, args, tool_context)` validates and redacts tool
  arguments.
- `after_tool_callback(tool, args, tool_context, tool_response)` normalizes or
  blocks tool responses before the model sees them.

The parameter names are intentional; ADK passes callback arguments by keyword.

