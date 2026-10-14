import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def class_setup(client):
    """Sets up a teacher, an enrolled student, an unenrolled student, and a live classroom."""
    uid = uuid.uuid4().hex[:6]
    teacher_email = f"teacher_{uid}@mindmap.edu"
    student_email = f"student_{uid}@mindmap.edu"
    other_email = f"other_{uid}@mindmap.edu"
    password = "Password123!"

    # Register teacher
    t_reg = client.post("/auth/register", json={
        "full_name": f"Teacher {uid}",
        "email": teacher_email,
        "password": password,
        "confirm_password": password,
        "role": "teacher"
    })
    assert t_reg.status_code == 201
    t_id = t_reg.json()["id"]

    # Register student
    s_reg = client.post("/auth/register", json={
        "full_name": f"Student {uid}",
        "email": student_email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert s_reg.status_code == 201
    s_id = s_reg.json()["id"]

    # Register unenrolled student
    o_reg = client.post("/auth/register", json={
        "full_name": f"Other {uid}",
        "email": other_email,
        "password": password,
        "confirm_password": password,
        "role": "student"
    })
    assert o_reg.status_code == 201
    o_id = o_reg.json()["id"]

    t_token = create_access_token(t_id, "teacher")
    s_token = create_access_token(s_id, "student")
    o_token = create_access_token(o_id, "student")

    # Create classroom
    c_resp = client.post("/classes", json={
        "name": f"Comm Class {uid}",
        "subject": "CS",
        "description": "Communication and Reporting Testing",
    }, headers={"Authorization": f"Bearer {t_token}"})
    assert c_resp.status_code == 201
    class_data = c_resp.json()
    class_code = class_data["class_code"]
    class_id = class_data["id"]

    # Enroll student
    j_resp = client.post("/classes/join", json={
        "class_code": class_code
    }, headers={"Authorization": f"Bearer {s_token}"})
    assert j_resp.status_code in [200, 201]

    return {
        "class_id": class_id,
        "class_code": class_code,
        "teacher_id": t_id,
        "teacher_token": t_token,
        "student_id": s_id,
        "student_token": s_token,
        "other_id": o_id,
        "other_token": o_token,
    }


def test_webrtc_config_endpoint(client, class_setup):
    """Verifies that authenticated users receive STUN/TURN ICE server configuration."""
    resp = client.get("/classes/webrtc-config", headers={"Authorization": f"Bearer {class_setup['student_token']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "ice_servers" in data
    assert len(data["ice_servers"]) >= 1
    assert "urls" in data["ice_servers"][0]

    # Unauthenticated rejected
    unauth = client.get("/classes/webrtc-config")
    assert unauth.status_code == 401


def test_chat_messaging_and_authorization(client, class_setup):
    """Tests sending and retrieving chat messages with role-based access control."""
    code = class_setup["class_code"]

    # Teacher sends message
    t_send = client.post(
        f"/classes/{code}/messages",
        json={"text": "Welcome to class everyone!"},
        headers={"Authorization": f"Bearer {class_setup['teacher_token']}"}
    )
    assert t_send.status_code == 201
    t_msg = t_send.json()
    assert t_msg["text"] == "Welcome to class everyone!"
    assert t_msg["sender_role"] == "teacher"
    assert t_msg["class_code"] == code

    # Enrolled student sends message
    s_send = client.post(
        f"/classes/{code}/messages",
        json={"text": "Hello teacher, ready to learn."},
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert s_send.status_code == 201
    s_msg = s_send.json()
    assert s_msg["text"] == "Hello teacher, ready to learn."
    assert s_msg["sender_role"] == "student"

    # Unenrolled student attempt to send message is rejected with 403 Forbidden
    o_send = client.post(
        f"/classes/{code}/messages",
        json={"text": "I am an unauthorized intruder."},
        headers={"Authorization": f"Bearer {class_setup['other_token']}"}
    )
    assert o_send.status_code == 403

    # Fetch chat history as enrolled student
    history_resp = client.get(
        f"/classes/{code}/messages",
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert history_resp.status_code == 200
    msgs = history_resp.json()
    assert len(msgs) >= 2
    texts = [m["text"] for m in msgs]
    assert "Welcome to class everyone!" in texts
    assert "Hello teacher, ready to learn." in texts

    # Unenrolled student cannot fetch chat history
    o_history = client.get(
        f"/classes/{code}/messages",
        headers={"Authorization": f"Bearer {class_setup['other_token']}"}
    )
    assert o_history.status_code == 403


def test_screen_share_permissions(client, class_setup):
    """Verifies teacher control of screen sharing permissions."""
    code = class_setup["class_code"]
    s_id = class_setup["student_id"]

    # Initially student cannot share by default if not open
    perm_init = client.get(
        f"/classes/{code}/screen-share-permission",
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert perm_init.status_code == 200
    assert perm_init.json()["can_share"] is False

    # Student cannot update permissions (403 Forbidden)
    s_update = client.post(
        f"/classes/{code}/screen-share-permission",
        json={"is_open_to_all": True},
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert s_update.status_code == 403

    # Teacher grants permission to all
    t_open = client.post(
        f"/classes/{code}/screen-share-permission",
        json={"is_open_to_all": True},
        headers={"Authorization": f"Bearer {class_setup['teacher_token']}"}
    )
    assert t_open.status_code == 200
    assert t_open.json()["is_open_to_all"] is True

    # Now student can share
    perm_open = client.get(
        f"/classes/{code}/screen-share-permission",
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert perm_open.json()["can_share"] is True

    # Teacher revokes open to all, but grants specific student
    client.post(
        f"/classes/{code}/screen-share-permission",
        json={"is_open_to_all": False, "allowed_student_id": s_id, "action": "grant"},
        headers={"Authorization": f"Bearer {class_setup['teacher_token']}"}
    )
    perm_grant = client.get(
        f"/classes/{code}/screen-share-permission",
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert perm_grant.json()["can_share"] is True
    assert s_id in perm_grant.json()["allowed_students"]


def test_report_data_role_separation(client, class_setup):
    """Verifies teacher sees class report and roster, student sees ONLY their own data."""
    code = class_setup["class_code"]

    # Teacher requests report data
    t_rep = client.get(
        f"/classes/{code}/report-data",
        headers={"Authorization": f"Bearer {class_setup['teacher_token']}"}
    )
    assert t_rep.status_code == 200
    t_data = t_rep.json()
    assert "student_roster" in t_data
    assert "total_students_enrolled" in t_data
    assert t_data["class_code"] == code
    assert "data_limitations_notice" in t_data
    # Verify student is listed in teacher roster
    roster_ids = [s["student_id"] for s in t_data["student_roster"]]
    assert class_setup["student_id"] in roster_ids

    # Student requests report data
    s_rep = client.get(
        f"/classes/{code}/report-data",
        headers={"Authorization": f"Bearer {class_setup['student_token']}"}
    )
    assert s_rep.status_code == 200
    s_data = s_rep.json()
    # Student response is personal: does NOT expose student_roster
    assert "student_roster" not in s_data
    assert s_data["student_id"] == class_setup["student_id"]
    assert "personal_avg_attention" in s_data
    assert "metric_explanations" in s_data

    # Unenrolled user cannot access report data
    o_rep = client.get(
        f"/classes/{code}/report-data",
        headers={"Authorization": f"Bearer {class_setup['other_token']}"}
    )
    assert o_rep.status_code == 403
