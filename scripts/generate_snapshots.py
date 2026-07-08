#!/usr/bin/env python3
"""Regenerate API response snapshots for regression testing."""

from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from httpx import ASGITransport, AsyncClient

from app.main import app

SNAPSHOT_DIR = ROOT / "tests" / "snapshots"
VOLATILE_KEYS = {"assessment_id", "generated_at"}


def normalize(obj, parent_key: str | None = None):
    if isinstance(obj, dict):
        return {
            k: ("<UUID>" if k in VOLATILE_KEYS else normalize(v, k))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [normalize(item, parent_key) for item in obj]
    if isinstance(obj, str) and parent_key in VOLATILE_KEYS:
        return "<TIMESTAMP>" if "T" in obj and re.match(r"\d{4}-\d{2}", obj) else obj
    return obj


async def fetch_snapshot(client: AsyncClient, name: str, method: str, path: str, **kwargs) -> None:
    if method == "GET":
        response = await client.get(path, **kwargs)
    else:
        response = await client.post(path, **kwargs)
    data = normalize(response.json())
    out = SNAPSHOT_DIR / f"{name}.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


async def main() -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await fetch_snapshot(client, "root", "GET", "/")
        await fetch_snapshot(client, "health", "GET", "/api/v1/health")
        await fetch_snapshot(client, "integrations_status", "GET", "/api/v1/integrations/status")
        await fetch_snapshot(client, "demo_assessment_credit", "GET", "/api/v1/assess/demo", params={"audience": "credit_team"})
        await fetch_snapshot(client, "demo_assessment_risk", "GET", "/api/v1/assess/demo", params={"audience": "risk_team"})
        await fetch_snapshot(client, "policies_auto", "GET", "/api/v1/policies/catalog", params={"sector": "auto_components"})
        await fetch_snapshot(client, "bureau_pull", "POST", "/api/v1/integrations/bureau/pull", params={
            "gstin": "27AABCS1234F1Z5", "pan": "AABCS1234F", "business_name": "Shree Ganesh Auto Components Pvt Ltd",
        })
        await fetch_snapshot(client, "tax_verify", "POST", "/api/v1/integrations/tax/verify", params={
            "gstin": "27AABCS1234F1Z5", "pan": "AABCS1234F",
        })


if __name__ == "__main__":
    asyncio.run(main())
