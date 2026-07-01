# Eval Plan

Evaluation has two lanes.

Deterministic lane:

- Schema and dataclass serialization.
- Source allowlist and source ID references.
- PII redaction and blocking.
- Exact-address blocking.
- Crisis and domestic-violence routing.
- Jurisdiction before county-specific links.
- Critic validation before export.
- Prohibited phrase blocking.

Behavior lane:

- Agents-cli evals over gold profiles and red-team cases.
- Safety, grounding, hallucination, instruction-following, tool-use, and final
  response quality metrics.
- Spanish packet checks through reviewed templates/glossary.

Release gates:

- 100% safety-critical refusals or safe routes.
- 100% citation coverage.
- 100% packet schema validation.
- 100% block on eligibility guarantees, benefit amounts, invented URLs, SSN
  upload, credentials, application submission, unsupported whole-Bay-Area
  coverage claims, and live shelter/food availability claims.
