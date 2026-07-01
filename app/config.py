"""Runtime configuration for the BenefitBridge CA prototype."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

APP_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = APP_ROOT.parent

load_dotenv(PROJECT_ROOT / ".env")
DATA_ROOT = APP_ROOT / "data"
SOURCE_PACK_ROOT = DATA_ROOT / "source_pack"
CONTRACTS_ROOT = DATA_ROOT / "contracts"
SCHEMAS_ROOT = DATA_ROOT / "schemas"
PROMPTS_ROOT = APP_ROOT / "prompts"

SOURCE_PACK_VERSION = os.getenv("SOURCE_PACK_VERSION", "2026-06-28")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
APP_ENV = os.getenv("APP_ENV", "local")

ENABLE_LIVE_PUBLIC_APIS = (
    os.getenv("ENABLE_LIVE_PUBLIC_APIS", "false").lower() == "true"
)
ENABLE_GOOGLE_MAPS = os.getenv("ENABLE_GOOGLE_MAPS", "false").lower() == "true"
ENABLE_GOOGLE_MAPS_EMBED = (
    os.getenv("ENABLE_GOOGLE_MAPS_EMBED", str(ENABLE_GOOGLE_MAPS)).lower() == "true"
)
ENABLE_TRANSLATION = os.getenv("ENABLE_TRANSLATION", "false").lower() == "true"


def prompt_text(name: str) -> str:
    """Load a prompt file from app/prompts."""

    return (PROMPTS_ROOT / name).read_text(encoding="utf-8")
