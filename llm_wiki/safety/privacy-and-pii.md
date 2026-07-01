# Privacy And PII

The demo must work with synthetic or privacy-preserving profiles.

Blocked or redacted data:

- SSNs.
- EBT/PINs, card numbers, and payment details.
- Account credentials.
- Case numbers.
- Dates of birth.
- Real identity documents or immigration documents.
- Exact addresses unless a narrow location tool has explicit session consent.
- Exact shelter or domestic-violence safety locations.

Telemetry may record only buckets:

- County or city bucket.
- Language.
- Flow step.
- Tool name.
- Source IDs.
- Status labels.
- Validation results.
- Redaction counts.
- Latency.
- Eval outcome.

Raw sensitive text must not be logged, stored, exported, or passed to the model
after detection.

