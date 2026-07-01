# Privacy and Security Notes

## Data minimization

The MVP should run without an account and without real document uploads. It should collect only enough to route by county and prepare a packet.

## Blocked data in demo

- SSNs.
- EBT card numbers/PINs.
- BenefitsCal credentials.
- Case numbers.
- Birthdates.
- Immigration documents.
- Real IDs/passports.
- Exact shelter-seeker locations unless necessary and user-consented.

## Logging

- Log source IDs, tool names, and validation results.
- Do not log sensitive free-text messages by default.
- Run DLP/redaction before telemetry.
- Add “clear session” functionality.

## Domestic violence and safety

If domestic violence, stalking, trafficking, or immediate danger is detected, switch to a safety-sensitive handoff. Do not store or share the user’s exact address. Provide hotline resources and simple, non-prescriptive next steps.
