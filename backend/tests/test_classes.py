import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def teacher_auth(client):
    uid = uuid.uuid4().hex[:8]
    email = f"prof_{uid}@mindmap.edu"
    password = f"P@ssword_{uid}"
    reg = client.post("/auth/register", json={
        "full_name": f"Prof. Vance {uid}",
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": "teacher"
    })
    assert reg.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"token": token, "email": email, "id": reg.json()["id"]}


@pytest.fixture(scope="module")
def student_auth(client):
    uid = uuid.uuid4().hex[:8]
    email = f"student_{uid}@mindmap.edu"
    password = f"P@ssword_{uid}"
    reg = client.post("/auth/register", json={
        "full_name": f"Student {uid}",
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert reg.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"token": token, "email": email, "id": reg.json()["id"]}


@pytest.fixture(scope="module")
def student_2_auth(client):
    uid = uuid.uuid4().hex[:8]
    email = f"student2_{uid}@mindmap.edu"
    password = f"P@ssword_{uid}"
    reg = client.post("/auth/register", json={
        "full_name": f"Student Two {uid}",
        "email": email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert reg.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"token": token, "email": email, "id": reg.json()["id"]}


def test_root_endpoint(client):
    """Verify root endpoint returns HTTP 200 OK (resolving Render 404 issue)."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert "MindMap" in data["system"]


def test_teacher_create_class_success(client, teacher_auth):
    """Teacher creates a class successfully and receives a unique class code."""
    res = client.post(
        "/api/classes",
        json={
            "name": "Advanced Neural Networks",
            "subject": "Computer Science",
            "description": "Deep learning architectures & backprop",
        },
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Advanced Neural Networks"
    assert data["subject"] == "Computer Science"
    assert data["status"] == "SCHEDULED"
    assert len(data["class_code"]) >= 4
    assert data["teacher_id"] == teacher_auth["id"]


def test_student_cannot_create_class(client, student_auth):
    """Student cannot create classes (403 Forbidden)."""
    res = client.post(
        "/api/classes",
        json={
            "name": "Unauthorized Class",
            "subject": "Cheating 101",
        },
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert res.status_code == 403


def test_student_join_and_roster_flow(client, teacher_auth, student_auth):
    """End-to-end test: teacher creates class, student joins via code, roster updates."""
    # 1. Teacher creates class
    res = client.post(
        "/api/classes",
        json={
            "name": "Linear Algebra & Vectors",
            "subject": "Mathematics",
        },
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert res.status_code == 201
    class_data = res.json()
    class_id = class_data["id"]
    code = class_data["class_code"]

    # 2. Student joins via code
    join_res = client.post(
        "/api/classes/join",
        json={"class_code": code},
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert join_res.status_code == 201
    enrollment = join_res.json()
    assert enrollment["class_id"] == class_id
    assert enrollment["class_code"] == code

    # 3. Duplicate enrollment rejected
    dup_res = client.post(
        "/api/classes/join",
        json={"class_code": code},
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert dup_res.status_code == 409

    # 4. Student sees class in their enrolled list
    std_classes = client.get(
        "/api/classes/student",
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert std_classes.status_code == 200
    my_codes = [c["class_code"] for c in std_classes.json()]
    assert code in my_codes

    # 5. Teacher inspects roster
    roster_res = client.get(
        f"/api/classes/{class_id}/students",
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert len(roster) >= 1
    assert any(s["student_id"] == student_auth["id"] for s in roster)


def test_invalid_class_code_join(client, student_auth):
    """Joining with a non-existent code returns 404."""
    res = client.post(
        "/api/classes/join",
        json={"class_code": "NONEXISTENT-999"},
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert res.status_code == 404


def test_class_lifecycle_start_and_end(client, teacher_auth, student_2_auth):
    """Teacher starts class (LIVE) and ends class (ENDED); student cannot join ended class."""
    # 1. Create class
    create_res = client.post(
        "/api/classes",
        json={"name": "Lifecycle Physics", "subject": "Physics"},
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    class_id = create_res.json()["id"]
    code = create_res.json()["class_code"]

    # 2. Start class
    start_res = client.post(
        f"/api/classes/{class_id}/start",
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "LIVE"

    # 3. End class
    end_res = client.post(
        f"/api/classes/{class_id}/end",
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "ENDED"

    # 4. Student attempt to join ended class is rejected
    join_res = client.post(
        "/api/classes/join",
        json={"class_code": code},
        headers={"Authorization": f"Bearer {student_2_auth['token']}"},
    )
    assert join_res.status_code == 400


def test_student_stats_endpoint(client, student_auth):
    """Student stats endpoint returns valid numeric structure."""
    res = client.get(
        "/api/classes/student/stats",
        headers={"Authorization": f"Bearer {student_auth['token']}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_classes_enrolled" in data
    assert "total_sessions_attended" in data
    assert "overall_avg_attention" in data
    assert "overall_avg_confusion" in data


def test_class_analytics_endpoint(client, teacher_auth):
    """Teacher retrieves class analytics."""
    create_res = client.post(
        "/api/classes",
        json={"name": "Analytics Test Class", "subject": "Data Science"},
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    class_id = create_res.json()["id"]

    analytics_res = client.get(
        f"/api/classes/{class_id}/analytics",
        headers={"Authorization": f"Bearer {teacher_auth['token']}"},
    )
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert data["class_id"] == class_id
    assert "overall_avg_attention" in data
    assert "recent_sessions" in data
