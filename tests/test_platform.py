"""Platform authentication and API tests."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_demo_credentials(client):
    r = await client.get("/api/v1/auth/demo-credentials")
    assert r.status_code == 200
    data = r.json()
    assert len(data["bank"]) >= 4
    assert len(data["msme"]) >= 2


@pytest.mark.asyncio
async def test_bank_login_and_dashboard(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "credit@idbi.bank.in", "password": "IDBI@2026"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["organization_type"] == "bank"

    dash = await client.get("/api/v1/bank/dashboard", headers=headers)
    assert dash.status_code == 200
    assert dash.json()["portfolio_count"] >= 3

    portfolio = await client.get("/api/v1/bank/portfolio", headers=headers)
    assert portfolio.status_code == 200
    assert len(portfolio.json()) >= 3


@pytest.mark.asyncio
async def test_msme_login_quick_assess_and_report(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "rajesh@shreeganesh.in", "password": "MSME@2026"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    assess = await client.post("/api/v1/msme/assess/quick", headers=headers)
    assert assess.status_code == 200
    result = assess.json()
    assert result["overall_score"] > 0
    assert len(result["dimension_scores"]) == 20

    report = await client.get(f"/api/v1/reports/{result['assessment_id']}", headers=headers)
    assert report.status_code == 200
    detail = report.json()
    assert "executive_summary" in detail
    assert "credit_decision_recommendation" in detail

    html = await client.get(f"/api/v1/reports/{result['assessment_id']}/html", headers=headers)
    assert html.status_code == 200
    assert "Financial Health Score" in html.text


@pytest.mark.asyncio
async def test_bank_assess_portfolio_msme(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@idbi.bank.in", "password": "IDBI@2026"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = await client.post("/api/v1/bank/assess/msme-demo-001", headers=headers)
    assert r.status_code == 200
    assert r.json()["grade"] in {"A+", "A", "B+", "B", "C+", "C", "D", "F"}


@pytest.mark.asyncio
async def test_unauthorized_access(client):
    r = await client.get("/api/v1/bank/dashboard")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_msme_loan_submission(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "founder@greenfab.in", "password": "MSME@2026"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    loan = await client.post(
        "/api/v1/msme/loans",
        headers=headers,
        json={"loan_type": "working_capital", "amount_inr": 1500000, "tenure_months": 24, "purpose": "Inventory"},
    )
    assert loan.status_code == 201
    assert loan.json()["application_ref"].startswith("LN-")
