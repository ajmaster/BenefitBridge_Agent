# Agents CLI Lifecycle

Current stage: prototype.

Local lifecycle:

1. Inspect project shape with `agents-cli info`.
2. Run deterministic tests with `uv run pytest tests/unit tests/integration`.
3. Inspect available eval metrics with `agents-cli eval metric list`.
4. Run behavior evals only after credentials and data-export boundaries are
   approved.
5. Enhance the scaffold only after a deployment target is chosen.

Current manifest:

- `name`: `benefitbridge-ca`
- `agent_directory`: `app`
- `base_template`: `adk`
- `deployment_target`: `none`
- `region`: `us-east1`
- `agent_guidance_filename`: `AGENTS.md`

Future deployment default is Cloud Run unless the user explicitly chooses Agent
Runtime. Do not add deployment resources, persistent stores, or CI/CD without a
fresh implementation plan.

