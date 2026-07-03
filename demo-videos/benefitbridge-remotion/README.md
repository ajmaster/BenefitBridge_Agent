# AidAtlasCA Remotion Demos

Captions-only video demos for AidAtlasCA. The compositions use real
screens captured from the built FastAPI-served app and animate them with
Remotion overlays, zooms, callouts, and cursor motion.

## Flows

- `SanJoseFamilyNavigator`: San Jose family benefits navigator flow.
- `SfFoodShelterHandoff`: San Francisco food and shelter handoff flow.
- `SpanishWicPrep`: Spanish/WIC prep flow with missing-fact prompts.

## Commands

```bash
npm install
npm run capture
npm run typecheck
npm run still:all
npm run render:all
npm run verify:outputs
```

Rendered videos land in `out/`. Captured screenshots land in
`public/captures/`.

The capture script starts a local FastAPI server on `127.0.0.1:8091` unless
`BENEFITBRIDGE_DEMO_URL` is set.
