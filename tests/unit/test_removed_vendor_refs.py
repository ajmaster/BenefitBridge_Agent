from pathlib import Path


def test_removed_auth_vendor_names_do_not_remain_in_committed_sources() -> None:
    root = Path(__file__).resolve().parents[2]
    terms = ("fire" + "base", "fire" + "store")
    ignored_parts = {
        ".git",
        ".mypy_cache",
        ".next",
        ".pytest_cache",
        ".ruff_cache",
        ".venv",
        "__pycache__",
        "node_modules",
        "out",
    }
    text_suffixes = {
        ".css",
        ".feature",
        ".html",
        ".json",
        ".md",
        ".mjs",
        ".py",
        ".toml",
        ".ts",
        ".tsx",
        ".txt",
        ".yaml",
        ".yml",
    }
    offenders: list[str] = []

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if ignored_parts.intersection(path.parts):
            continue
        if path.suffix not in text_suffixes:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        if any(term in text for term in terms):
            offenders.append(str(path.relative_to(root)))

    assert offenders == []
