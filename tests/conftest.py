"""Shared pytest fixtures and snapshot helpers."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.seed import seed_platform_data
from app.db.session import SessionLocal, init_db
from app.main import app

SNAPSHOT_DIR = Path(__file__).parent / "snapshots"
VOLATILE_KEYS = {"assessment_id", "generated_at"}


@pytest.fixture(scope="session", autouse=True)
def _init_test_database():
    Path("data").mkdir(exist_ok=True)
    init_db()
    db = SessionLocal()
    try:
        seed_platform_data(db)
    finally:
        db.close()


def normalize_snapshot(obj, parent_key: str | None = None):
    if isinstance(obj, dict):
        return {k: ("<UUID>" if k in VOLATILE_KEYS else normalize_snapshot(v, k)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_snapshot(item, parent_key) for item in obj]
    if isinstance(obj, str) and parent_key in VOLATILE_KEYS:
        if re.match(r"\d{4}-\d{2}-\d{2}", obj):
            return "<TIMESTAMP>"
    return obj


@pytest.fixture
def snapshot_dir() -> Path:
    return SNAPSHOT_DIR


@pytest.fixture
async def api_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def load_snapshot(name: str) -> dict:
    path = SNAPSHOT_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def assert_matches_snapshot(actual: dict, name: str) -> None:
    expected = load_snapshot(name)
    assert normalize_snapshot(actual) == expected
