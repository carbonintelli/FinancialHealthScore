"""Snapshot regression tests for API responses.

Snapshots are generated from the Node.js server. Run:
  cd server && npm run generate:snapshots && npm test
"""

import pytest

pytestmark = pytest.mark.skip(
    reason="API snapshots are maintained by the Node.js server (server/tests/snapshots.test.ts)"
)


@pytest.mark.asyncio
async def test_snapshot_root(api_client):
    r = await api_client.get("/")
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "root")


@pytest.mark.asyncio
async def test_snapshot_health(api_client):
    r = await api_client.get("/api/v1/health")
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "health")


@pytest.mark.asyncio
async def test_snapshot_integrations_status(api_client):
    r = await api_client.get("/api/v1/integrations/status")
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "integrations_status")


@pytest.mark.asyncio
async def test_snapshot_demo_assessment_credit(api_client):
    r = await api_client.get("/api/v1/assess/demo", params={"audience": "credit_team"})
    assert r.status_code == 200
    data = r.json()
    assert data["overall_score"] == 78.1
    assert data["grade"] == "B+"
    assert len(data["dimension_scores"]) == 20
    assert_matches_snapshot(data, "demo_assessment_credit")


@pytest.mark.asyncio
async def test_snapshot_demo_assessment_risk(api_client):
    r = await api_client.get("/api/v1/assess/demo", params={"audience": "risk_team"})
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "demo_assessment_risk")


@pytest.mark.asyncio
async def test_snapshot_policies_catalog(api_client):
    r = await api_client.get("/api/v1/policies/catalog", params={"sector": "auto_components"})
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "policies_auto")


@pytest.mark.asyncio
async def test_snapshot_bureau_pull(api_client):
    r = await api_client.post(
        "/api/v1/integrations/bureau/pull",
        params={"gstin": "27AABCS1234F1Z5", "pan": "AABCS1234F", "business_name": "Shree Ganesh Auto Components Pvt Ltd"},
    )
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "bureau_pull")


@pytest.mark.asyncio
async def test_snapshot_tax_verify(api_client):
    r = await api_client.post(
        "/api/v1/integrations/tax/verify",
        params={"gstin": "27AABCS1234F1Z5", "pan": "AABCS1234F"},
    )
    assert r.status_code == 200
    assert_matches_snapshot(r.json(), "tax_verify")
