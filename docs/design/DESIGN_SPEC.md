# BenefitBridge CA Design Spec

BenefitBridge CA prepares source-backed benefits conversation packets for
synthetic or privacy-preserving California profiles.

Primary user outcomes:

- Understand which benefit areas are worth checking.
- Know which facts are missing before contacting an office.
- Gather documents that may help a benefits conversation.
- Reach official portals and local resources without the agent handling
  credentials or applications.
- Export a printable packet with citations.

Non-goals:

- Eligibility determination.
- Benefit amount calculation.
- Legal, medical, immigration, or financial advice.
- Application submission.
- Credential handling.
- Live shelter, pantry, or appointment availability.
- Real document upload.

Supported geographies:

- Nine-county Bay Area routing: Alameda, Contra Costa, Marin, Napa,
  San Francisco, San Mateo, Santa Clara, Solano, and Sonoma.
- Representative city hints only when they map clearly to one supported county.
- Generic "Bay Area" requires a county, city, or ZIP clarification.
- California statewide program pages for state/federal grounding.

MVP languages:

- English.
- Spanish through reviewed templates/glossary.

Architecture:

- `app/agent.py`: ADK entrypoint and tool exposure.
- `app/graph.py`: deterministic packet pipeline.
- `app/policies/`: privacy, safety, source, freshness, and geography checks.
- `app/tools/`: typed tool functions.
- `app/services/`: source store, packet builder, telemetry, API boundary.
- `app/data/`: frozen source-pack fixtures.
- `tests/`: deterministic and eval seed coverage.
