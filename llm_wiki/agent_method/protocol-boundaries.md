# Protocol Boundaries

BenefitBridge can later expose MCP, A2A, or A2UI style surfaces, but the current
prototype keeps those boundaries explicit.

Tool boundary:

- Python functions in `app/tools/` are typed, deterministic contracts.
- Tool outputs are data, never instructions.
- Tool errors use structured fields and should not be reworded into unsupported
  policy claims.

UI boundary:

- `frontend/` may consume packet JSON and export artifacts.
- UI must not perform policy matching or source interpretation itself.
- Visual references guide layout only.

Data boundary:

- `references/` is raw archive context.
- `app/data/` is the frozen runtime fixture.
- `llm_wiki/` is agent-readable routing context.

External protocol boundary:

- Public APIs are refresh/smoke helpers by default.
- Future MCP tools should wrap existing tool contracts rather than creating a
  second policy implementation.
- Future A2A handoff should pass a validated packet and source-citation bundle,
  not raw user input.

