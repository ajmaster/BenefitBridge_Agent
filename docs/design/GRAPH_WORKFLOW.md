# Graph Workflow

The graph is deterministic so tests can verify safety-critical order without an
LLM.

Pipeline:

1. Redact and block sensitive input.
2. Route crisis or domestic violence before normal benefit prep.
3. Resolve pilot geography from city, ZIP, or county.
4. Load the relevant county profile.
5. Match needs to benefit program areas.
6. Attach approved source citations.
7. Build a prep packet.
8. Validate schema, citations, prohibited claims, and source domains.
9. Translate/export only after validation.
10. Emit telemetry summary with no raw sensitive text.

The agent can call tools interactively, but packet export must still pass
`validate_packet`.

