"""Integration client unit tests."""

import pytest

from app.services.integrations import bureau_client, document_client, legal_client, tax_client


@pytest.mark.asyncio
async def test_bureau_mock_report():
    result = await bureau_client.pull_commercial_report("27AABCS1234F1Z5", "AABCS1234F", "Test MSME")
    assert result["success"] is True
    assert result["mock"] is True
    assert result["data"]["crisilRating"] == "BBB+"


@pytest.mark.asyncio
async def test_tax_mock_verify():
    result = await tax_client.verify("27AABCS1234F1Z5", "AABCS1234F")
    assert result["success"] is True
    assert result["data"]["itrFiledOnTime3y"] == 3


@pytest.mark.asyncio
async def test_legal_mock_search():
    result = await legal_client.search("Test MSME", ["Director One"])
    assert result["success"] is True
    assert result["data"]["pendingCompanyCases"] == 0


@pytest.mark.asyncio
async def test_document_mock_validation():
    docs = [{"document_type": "itr", "file_name": "itr.pdf"}]
    result = await document_client.validate_documents(docs)
    assert result["data"]["validated"] == 1
    assert result["data"]["results"][0]["status"] == "verified"
