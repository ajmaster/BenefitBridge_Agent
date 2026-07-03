# AidAtlasCA

AidAtlasCA is a Google ADK / agents-cli prototype for a California-only
benefits preparation and handoff assistant. It helps synthetic or
privacy-preserving profiles prepare source-backed packets for official benefit
conversations.

It does not determine eligibility, calculate benefit amounts, submit
applications, handle credentials, or collect sensitive documents.

## Layout

- `app/` - ADK entrypoint, deterministic graph, tools, policies, schemas, and
  source-pack services.
- `app/data/` - runtime fixture copies from the approved source pack.
- `tests/unit` and `tests/integration` - deterministic code verification.
- `tests/eval` - agents-cli behavior eval seed datasets and config.
- `llm_wiki/` - curated context layer for future agents.
- `references/` - raw source docs, build spec, and visual references.
- `scripts/` - smoke, validation, freeze, and eval dataset helper scripts.
- `frontend/` - static-export Next.js/React public-demo app served by FastAPI.
- `deployment/` - approval-gated Cloud Run command notes.
- `Dockerfile` - single-service image: static Next frontend plus FastAPI API.

## Local App

```bash
uv run uvicorn app.fast_api_app:app --host 127.0.0.1 --port 8080
```

The Next frontend can also run separately with `npm --prefix frontend run dev`.
When it is not served by FastAPI, set `NEXT_PUBLIC_API_BASE_URL` to the FastAPI
origin, for example `http://127.0.0.1:8080`.

Google Maps embeds are optional. Use
`NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_EMBED=true` plus a browser-restricted
`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` to render iframe embeds. For local
frontend dev, also set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ALLOWED_ORIGINS` to the
exact browser origins you authorized on the Maps browser key, for example
`http://127.0.0.1:3002,http://localhost:3002`. Set
`ENABLE_GOOGLE_MAPS_EMBED=true` on FastAPI when it serves the frontend so CSP
allows Google Maps frames. Without matching values, the UI shows the stylized
map and safe Google Maps search links only.

Google Places enrichment is also optional and backend-only. Set
`ENABLE_GOOGLE_MAPS=true` plus `GOOGLE_MAPS_API_KEY` or
`GOOGLE_MAPS_API_KEY_SECRET` to enrich curated resource cards. The default
`GOOGLE_MAPS_PLACES_FIELD_TIER=pro` requests place name, formatted address,
business status, and Google Maps URI. Use `ids_only` for the lowest-cost
lookup or `enterprise` when the deployment intentionally wants phone, website,
and rating fields within the current Google free usage caps. Do not request
opening-hours fields or show live availability.

Voice is optional and requires both server and frontend flags:
`ENABLE_VOICE=true` for `/api/voice/turn` and `NEXT_PUBLIC_ENABLE_VOICE=true`
for the browser recorder. The server uses Google Cloud Speech-to-Text and
Text-to-Speech when the libraries and credentials are available, then routes the
transcript through the same safety path as text chat.

Routes:

- `GET /healthz`
- `POST /api/chat`
- `POST /api/voice/turn`
- `POST /api/prepare`
- `POST /api/validate`
- `POST /api/export`
- `POST /api/translate`
- `GET /api/sources`
- `GET /api/resources`
- `GET /api/eval/readiness`

## Local Verification

```bash
agents-cli info
uv run pytest -p no:cacheprovider tests/unit tests/integration
uv run python scripts/validate_source_pack.py
python3 scripts/sync_frontend_data.py --check
agents-cli lint
agents-cli eval metric list
agents-cli eval grade --traces artifacts/traces --config tests/eval/eval_config.yaml --output /tmp/aidatlasca-grade-local
cd frontend && npm ci && npm run typecheck && npm run lint && npm run build && npm run test:e2e && npm audit --audit-level=moderate
docker build -t aidatlasca:local .
```

`agents-cli eval generate`, managed eval submit/results, live public API smoke,
and Cloud Run deployment remain approval-gated because they can call managed
services or mutate cloud resources.

## Safety Gates

- 100% safety-critical refusal behavior.
- 100% approved citations for benefit suggestions.
- 100% packet schema validation.
- No eligibility guarantees, dollar estimates, invented URLs, SSN upload
  instructions, credential handling, or application-submission claims.
- Raw trace/result artifacts are ignored by default; keep curated summaries for
  evidence instead of committing prompts or agent traces.
