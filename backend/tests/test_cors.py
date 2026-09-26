"""
MindMap - CORS Configuration Test Suite
Verifies:
1. Preflight OPTIONS requests to /auth/login and /auth/register succeed with HTTP 200
2. Production Vercel origin is explicitly allowed
3. Localhost development origins (localhost:5173, 127.0.0.1:5173) are allowed
4. Credentials flag is preserved (allow_credentials=True)
5. Disallowed origins do not receive Access-Control-Allow-Origin
6. allow_origins is NOT wildcard '*' when allow_credentials is True
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

PROD_ORIGIN = "https://mindmap-real-time-student-attention-confusion-detector-v4lfg.vercel.app"
PREV_PROD_ORIGIN = "https://mind-map-real-time-student-attention.vercel.app"
LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize("origin", [PROD_ORIGIN, PREV_PROD_ORIGIN] + LOCAL_ORIGINS)
@pytest.mark.parametrize("path", ["/auth/login", "/auth/register", "/api/auth/login", "/api/auth/register"])
def test_cors_preflight_allowed_origins(client, origin, path):
    """Test that preflight OPTIONS requests return 200 with appropriate CORS headers."""
    resp = client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type, authorization",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin
    assert resp.headers.get("access-control-allow-credentials") == "true"
    allow_methods = resp.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods or "*" in allow_methods


def test_cors_preflight_disallowed_origin(client):
    """Test that untrusted origins do not receive Access-Control-Allow-Origin."""
    resp = client.options(
        "/auth/login",
        headers={
            "Origin": "https://malicious-site.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert "access-control-allow-origin" not in resp.headers


def test_cors_not_wildcard():
    """Verify that allow_origins does not contain literal '*' in configuration."""
    from app.core.config import settings
    origins = settings.get_cors_origins()
    assert "*" not in origins
