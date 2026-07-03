"""Firebase ID token verification for the optional demo-gate auth flag.

Firebase Auth was chosen because it needs no server session/cookie state,
which fits the existing bearer-token, `allow_credentials=False` CORS setup in
`app/fast_api_app.py`. When `ENABLE_AUTH` is off (the default), this module
does not touch Firebase at all and every request is treated as authorized,
so local dev and the existing test suite are unaffected unless the flag is
explicitly turned on.
"""

from __future__ import annotations

from typing import Any

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import ENABLE_AUTH

_firebase_app: firebase_admin.App | None = None


def _get_firebase_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        _firebase_app = firebase_admin.initialize_app(credentials.ApplicationDefault())
    return _firebase_app


def _verify_id_token(token: str) -> dict[str, Any]:
    """Thin wrapper kept separate from the dependency so tests can patch it."""

    return firebase_auth.verify_id_token(token, app=_get_firebase_app())


def verify_firebase_id_token(
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    """FastAPI dependency gating `/api/*` behind a Firebase ID token.

    Returns only a transient identity dict scoped to the current request.
    Per `llm_wiki/safety/privacy-and-pii.md`, this identity must never be
    logged, stored, or included in telemetry.
    """

    if not ENABLE_AUTH:
        return {"uid": "auth_disabled", "email": ""}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "AUTH_REQUIRED",
                "message": "Sign in required for the demo.",
            },
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = _verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "AUTH_INVALID",
                "message": "Sign-in session is invalid or expired.",
            },
        ) from exc

    return {"uid": str(decoded.get("uid", "")), "email": str(decoded.get("email", ""))}
