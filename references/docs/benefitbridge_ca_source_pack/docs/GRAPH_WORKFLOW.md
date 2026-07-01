# ADK Graph Workflow Sketch

```text
Start
  ↓
ConsentAndPrivacyNode
  ↓
LanguageNode
  ↓
SafetyTriageNode
  ├── UrgentHandoffNode
  └── StandardBenefitsPrepNode
  ↓
JurisdictionNode
  ↓
HouseholdSnapshotNode
  ↓
NeedsClassifierNode
  ↓
OfficialSourceRetrievalNode
  ↓
BenefitPathMatcherNode
  ↓
MissingFactsNode
  ↓
DocumentChecklistNode
  ↓
AgencyContactNode
  ↓
SafetyAndGroundingCriticNode
  ↓
TranslationNode
  ↓
ExportPrepPacketNode
  ↓
EvalTelemetryNode
```

## Why graph workflow

The order matters: privacy before logging, safety before benefits matching, county lookup before county-specific links, retrieval before recommendations, and critic before export.
