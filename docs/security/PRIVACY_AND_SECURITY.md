# Privacy And Security

BenefitBridge is designed as a preparation assistant for synthetic or
privacy-preserving profiles.

Controls:

- PII detection and redaction before graph processing.
- ADK callback checks before tool execution.
- No persistent store in the current manifest.
- No exact-address cache.
- No credential, case-status, or application-submission tools.
- No real document upload.
- No raw sensitive telemetry.

Sensitive content should be blocked or reduced to safe buckets. The only
permitted telemetry fields are listed in `llm_wiki/safety/privacy-and-pii.md`.

If future deployment adds Cloud Run, Firestore, Cloud Storage, BigQuery, DLP, or
Maps integrations, revisit data retention, encryption, IAM, audit logging,
abuse reporting, and user-data deletion before enabling them.

