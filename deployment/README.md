# BenefitBridge CA Cloud Run Deployment

Single-service target:

- Project: `benefitsnav`
- Region: `us-central1`
- Service: `benefitbridge-ca`
- Container port: `8080`
- Runtime: FastAPI serves `/api/*`, `/healthz`, and static `frontend/out`
- Access model: public demo only after explicit approval for unauthenticated access

Approval-gated commands:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com aiplatform.googleapis.com logging.googleapis.com monitoring.googleapis.com cloudtrace.googleapis.com translate.googleapis.com dlp.googleapis.com firestore.googleapis.com storage.googleapis.com
agents-cli deploy --deployment-target cloud_run --project benefitsnav --region us-central1 --service-name benefitbridge-ca --port 8080 --memory 1Gi --cpu 1 --min-instances 0 --max-instances 3 --concurrency 40 --update-env-vars GOOGLE_CLOUD_PROJECT=benefitsnav,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=true,APP_ENV=cloud_run
gcloud run services add-iam-policy-binding benefitbridge-ca --project benefitsnav --region us-central1 --member allUsers --role roles/run.invoker
```

Local preflight:

```bash
uv run pytest tests/unit tests/integration
uv run python scripts/validate_source_pack.py
cd frontend && npm ci && npm run typecheck && npm run build && npm run test:e2e
docker build -t benefitbridge-ca:local .
docker run --rm -p 8080:8080 benefitbridge-ca:local
curl -fsS http://127.0.0.1:8080/healthz
```

Do not deploy with `.env` values. Use Secret Manager or Cloud Run secret env
vars for all secrets. Packet exports are session-local by default; Firestore and
Cloud Storage must remain opt-in for redacted metadata or non-sensitive artifacts.
