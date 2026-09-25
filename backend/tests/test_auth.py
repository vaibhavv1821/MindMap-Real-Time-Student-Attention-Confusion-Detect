"""
MindMap - Authentication Test Suite (Direct Email + Password Authentication)

Verifies:
1. Registration with valid email/password and password confirmation
2. Password gets securely hashed in MongoDB (bcrypt)
3. User is stored in MongoDB Atlas and immediately activated (is_active=True)
4. Registration does NOT require OTP or email verification
5. Login with correct email/password succeeds
6. Login returns a valid JWT access token and refresh token
7. Wrong password rejected with "Invalid email or password"
8. Wrong email rejected with "Invalid email or password"
9. Missing email rejected
10. Missing password rejected
11. Protected route (/auth/me) works after login with valid Bearer token
12. End-to-end authentication completes without any OTP requirement
13. Password confirmation mismatch is rejected
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import verify_password, decode_token
from app.db.mongodb import get_db


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def registered_user(client):
    test_id = uuid.uuid4().hex[:8]
    email = f"test_{test_id}@mindmap.edu"
    password = f"P@ssword_{test_id}"
    full_name = f"Test Student {test_id}"

    resp = client.post("/auth/register", json={
        "full_name": full_name,
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert resp.status_code == 201
    return {
        "email": email,
        "password": password,
        "full_name": full_name,
        "id": resp.json()["id"],
        "role": "student"
    }


def test_register_with_valid_email_password(client):
    """Test 1 & 4: Register with valid email/password succeeds without OTP."""
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"Student {uid}",
        "email": f"student_{uid}@mindmap.edu",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "student"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert data["role"] == "student"
    # Never expose password or hash to client
    assert "password" not in data
    assert "password_hash" not in data
    # No OTP fields returned
    assert "otp" not in data
    assert "verification_token" not in data


def test_password_gets_hashed_in_mongodb(registered_user):
    """Test 2: Verify password is saved as a bcrypt hash, never plain text."""
    from pymongo import MongoClient
    from app.core.config import settings
    mongo = MongoClient(settings.mongodb_uri)
    try:
        user_doc = mongo[settings.db_name]["users"].find_one({"email": registered_user["email"]})
        assert user_doc is not None
        assert "password_hash" in user_doc
        assert user_doc["password_hash"] != registered_user["password"]
        # Verify hash against plaintext
        assert verify_password(registered_user["password"], user_doc["password_hash"]) is True
        # Verify plaintext is absent from document
        assert "password" not in user_doc
    finally:
        mongo.close()


def test_user_stored_in_mongodb_and_active(registered_user):
    """Test 3: User document exists and is active without OTP verification."""
    from pymongo import MongoClient
    from app.core.config import settings
    mongo = MongoClient(settings.mongodb_uri)
    try:
        user_doc = mongo[settings.db_name]["users"].find_one({"email": registered_user["email"]})
        assert user_doc is not None
        assert user_doc["is_active"] is True
        assert user_doc["role"] == "student"
        # No OTP records required or generated
        assert "otp" not in user_doc
        assert "otp_code" not in user_doc
    finally:
        mongo.close()


def test_login_with_correct_email_password(client, registered_user):
    """Test 5 & 6: Login with email + password returns valid JWT tokens."""
    response = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("token_type") == "bearer"

    # Verify access token is valid and decodable
    payload = decode_token(data["access_token"])
    assert payload is not None
    assert payload.get("sub") == registered_user["id"]
    assert payload.get("role") == registered_user["role"]
    assert payload.get("type") == "access"


def test_wrong_password_rejected(client, registered_user):
    """Test 7: Wrong password returns 401 with 'Invalid email or password'."""
    response = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": "wrong_password_123"
    })
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid email or password"


def test_wrong_email_rejected(client):
    """Test 8: Non-existent email returns 401 with 'Invalid email or password'."""
    response = client.post("/auth/login", json={
        "email": f"nonexistent_{uuid.uuid4().hex[:8]}@mindmap.edu",
        "password": "some_password_123"
    })
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Invalid email or password"


def test_missing_email_rejected(client):
    """Test 9: Missing email field in login is rejected."""
    response = client.post("/auth/login", json={
        "password": "some_password_123"
    })
    assert response.status_code in [400, 422]


def test_missing_password_rejected(client):
    """Test 10: Missing password field in login is rejected."""
    response = client.post("/auth/login", json={
        "email": "test@mindmap.edu"
    })
    assert response.status_code in [400, 422]


def test_protected_route_works_after_login(client, registered_user):
    """Test 11: Protected /auth/me endpoint works with Bearer JWT token."""
    login_resp = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Authorized request
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    user_info = me_resp.json()
    assert user_info["email"] == registered_user["email"]
    assert user_info["full_name"] == registered_user["full_name"]
    assert user_info["role"] == registered_user["role"]

    # Unauthorized request without token
    unauth_resp = client.get("/auth/me")
    assert unauth_resp.status_code == 401


def test_end_to_end_flow_without_otp(client):
    """Test 12: Complete register -> login -> protected access with NO OTP."""
    uid = uuid.uuid4().hex[:8]
    email = f"e2e_{uid}@mindmap.edu"
    password = f"E2E_P@ssword_{uid}"
    name = f"E2E Student {uid}"

    # Step A: Register
    reg_resp = client.post("/auth/register", json={
        "full_name": name,
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert reg_resp.status_code == 201
    assert "otp" not in reg_resp.json()

    # Step B: Direct Login with Email + Password (NO OTP intermediate step)
    login_resp = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Step C: Access Protected Resource
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email


def test_password_confirmation_mismatch_rejected(client):
    """Test 13: Registration fails if password and confirm_password differ."""
    uid = uuid.uuid4().hex[:8]
    response = client.post("/auth/register", json={
        "full_name": f"Mismatch Student {uid}",
        "email": f"mismatch_{uid}@mindmap.edu",
        "password": "Password123!",
        "confirm_password": "DifferentPassword456!",
        "role": "student"
    })
    assert response.status_code == 422
