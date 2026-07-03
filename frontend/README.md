# Frontend Placeholder

The UI/demo is secondary to the agent, source pack, and eval loop.

Future frontend rules:

- Consume `PrepPacket` JSON from the agent/API boundary.
- Render printable HTML as the first export surface.
- Use `references/images/IMAGE_INDEX.md` for visual direction only.
- Do not copy policy text from images.
- Do not implement eligibility logic in the client.
- Do not collect credentials, SSNs, case numbers, or real documents.

## Static source data

The California explorer uses static JSON generated from `app/data/source_pack`
so exported frontend previews can show all 58 counties without a live API. After
source-pack changes, run `python3 scripts/sync_frontend_data.py` from the repo
root and verify with `python3 scripts/sync_frontend_data.py --check`.

## Google Maps Embed setup

Maps Embed is optional. To render the iframe preview locally, configure both
the Google Cloud key restriction and the public frontend allow-list:

- Enable Maps Embed API for the project that owns the browser key.
- Restrict the browser key to HTTP referrers, including the local origins you
  actually use, such as `http://127.0.0.1:3002/*` and
  `http://localhost:3002/*`.
- Set `NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_EMBED=true`.
- Set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`.
- Set `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ALLOWED_ORIGINS` to matching origins
  without paths, such as `http://127.0.0.1:3002,http://localhost:3002`.

Restart the frontend dev server after changing `NEXT_PUBLIC_*` values. If the
current browser origin is not listed, the resource map shows the safe fallback
link instead of loading a rejected Google iframe.

## Firebase Auth setup

Auth is optional and controlled by `NEXT_PUBLIC_ENABLE_AUTH`. When it is `true`,
`frontend/.env.local` must include the Firebase Web app SDK config:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Guest sign-in uses Firebase Anonymous Auth. Enable it in Firebase Console under
Authentication > Sign-in method > Anonymous, and authorize local/deployed
domains under Authentication > Settings > Authorized domains. Restart the
frontend dev server after changing any `NEXT_PUBLIC_*` value.
