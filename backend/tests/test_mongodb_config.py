"""
MindMap - Unit Tests for MongoDB Configuration & Decoupled Health Checks

Tests:
1. Settings loads MONGODB_URI and MONGODB_DATABASE from environment
2. Decoupled mode fallback when no URI is provided
3. Health endpoints /health and /health/db return valid status structures
4. Database connection failure handling is resilient and does not crash FastAPI
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings
from app.db.mongodb import ping_db


def test_settings_mongodb_aliases(monkeypatch):
    """Verifies that MONGODB_URI and MONGODB_DATABASE environment variables map correctly."""
    monkeypatch.setenv("MONGODB_URI", "mongodb+srv://user:pass@cluster.mongodb.net/testdb")
    monkeypatch.setenv("MONGODB_DATABASE", "mindmap_test")

    test_settings = Settings()
    assert test_settings.mongodb_uri == "mongodb+srv://user:pass@cluster.mongodb.net/testdb"
    assert test_settings.db_name == "mindmap_test"


def test_settings_legacy_db_name_alias(monkeypatch):
    """Verifies fallback to DB_NAME if MONGODB_DATABASE is not set."""
    monkeypatch.delenv("MONGODB_DATABASE", raising=False)
    monkeypatch.setenv("DB_NAME", "mindmap_legacy")

    test_settings = Settings()
    assert test_settings.db_name == "mindmap_legacy"


def test_health_endpoint_structure():
    """Verifies /health includes database status without breaking existing payload."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert "database" in data
    assert "status" in data["database"]
    assert "name" in data["database"]
    assert data["database"]["name"] == "mindmap"


def test_health_db_endpoint():
    """Verifies /health/db responds with connection telemetry."""
    client = TestClient(app)
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["CONNECTED", "DISCONNECTED"]
    assert data["database"] == "mindmap"
    assert data["ping"] in ["PONG", "FAILED"]


def test_ping_db_decoupled_mode():
    """Verifies ping_db() returns False cleanly when client is not connected."""
    import asyncio
    connected = asyncio.run(ping_db())
    # In test environment without Atlas URI, ping_db must safely return False
    assert connected is False

