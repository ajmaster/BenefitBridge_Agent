#!/usr/bin/env bash
set -euo pipefail

if [[ "${ENABLE_LIVE_PUBLIC_APIS:-false}" != "true" ]]; then
  echo "Live public API smoke tests are disabled."
  echo "Set ENABLE_LIVE_PUBLIC_APIS=true after network approval to run them."
  exit 0
fi

REFERENCE_SCRIPT="references/docs/BenefitBridge_CA_Build_Spec_Package/benefitbridge_api_smoke_tests.sh"

if [[ ! -f "${REFERENCE_SCRIPT}" ]]; then
  echo "Missing reference smoke script: ${REFERENCE_SCRIPT}" >&2
  exit 1
fi

bash "${REFERENCE_SCRIPT}"

