# Policy Server Behavior

There is no separate policy server in the prototype. Policy behavior is enforced
by local Python modules and ADK callbacks.

Current enforcement points:

- `app/policies/privacy.py`: PII redaction and blocking.
- `app/policies/safety.py`: crisis, domestic violence, and urgent routing.
- `app/policies/source_grounding.py`: approved domains, citations, and
  prohibited phrases.
- `app/policies/freshness.py`: stale-source and call-before-going rules.
- `app/callbacks.py`: ADK callback guardrails around agent and tool execution.
- `app/tools/validation.py`: final critic before export.

Future policy-server extraction should preserve the same test fixtures and
contracts before adding networked policy checks.

