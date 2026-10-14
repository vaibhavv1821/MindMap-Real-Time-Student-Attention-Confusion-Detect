import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mongodb import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import Role
from app.models.classroom import (
    ClassStatus,
    EnrollmentStatus,
    ParticipantStatus,
    ClassInDB,
    EnrollmentInDB,
    SessionInDB,
    SessionParticipantInDB,
)
from app.schemas.classroom import (
    CreateClassIn,
    ClassOut,
    JoinClassIn,
    EnrollmentOut,
    StudentRosterItem,
    SessionOut,
    AttendanceRecordOut,
    StudentStatsOut,
    ClassAnalyticsOut,
)
from app.core.config import settings
from app.features.connection_manager import manager
from app.schemas.communication import (
    ChatMessageIn,
    ChatMessageOut,
    ICEServerConfig,
    WebRTCConfigOut,
    ScreenSharePermissionUpdate,
    ClassReportDataOut,
    StudentPersonalReportOut,
    StudentReportSummary,
    SessionSummaryItem,
)

router = APIRouter(prefix="/classes", tags=["Classrooms & Enrollment"])


async def generate_unique_class_code(db, subject: str) -> str:
    """Generates a clean, readable unique room code like PHY-8392 or CS-4712."""
    prefix = "".join(c for c in subject[:3].upper() if c.isalnum())
    if len(prefix) < 2:
        prefix = "MM"
    for _ in range(20):
        digits = "".join(random.choices(string.digits, k=4))
        code = f"{prefix}-{digits}"
        existing = await db["classes"].find_one({"class_code": code})
        if not existing:
            return code
    # Fallback to random uppercase alphanumeric
    return f"ROOM-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"


def serialize_doc_id(doc: dict) -> str:
    return str(doc["_id"]) if "_id" in doc else str(doc.get("id", ""))


# ==========================================
# 1. TEACHER: CREATE & MANAGE CLASSES
# ==========================================

@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    data: CreateClassIn,
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    db = get_db()
    teacher_id = str(current_user["_id"])
    teacher_name = current_user.get("full_name", "Teacher")

    class_code = await generate_unique_class_code(db, data.subject)
    now = datetime.now(timezone.utc)

    class_doc = {
        "name": data.name.strip(),
        "subject": data.subject.strip(),
        "description": (data.description or "").strip(),
        "class_code": class_code,
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "scheduled_start": data.scheduled_start,
        "scheduled_end": data.scheduled_end,
        "status": ClassStatus.SCHEDULED.value,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["classes"].insert_one(class_doc)
    class_id = str(result.inserted_id)

    return ClassOut(
        id=class_id,
        class_code=class_code,
        name=class_doc["name"],
        subject=class_doc["subject"],
        description=class_doc["description"],
        teacher_id=teacher_id,
        teacher_name=teacher_name,
        scheduled_start=class_doc["scheduled_start"],
        scheduled_end=class_doc["scheduled_end"],
        status=ClassStatus.SCHEDULED,
        enrolled_count=0,
        active_students=0,
        avg_attention=0.0,
        avg_confusion=0.0,
        created_at=now.isoformat(),
    )


@router.get("/teacher", response_model=List[ClassOut])
async def list_teacher_classes(
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    db = get_db()
    teacher_id = str(current_user["_id"])

    cursor = db["classes"].find({"teacher_id": teacher_id}).sort("created_at", -1)
    classes = await cursor.to_list(length=100)

    results: List[ClassOut] = []
    for c in classes:
        c_id = str(c["_id"])
        enrolled = await db["enrollments"].count_documents({"class_id": c_id, "status": EnrollmentStatus.ACTIVE.value})

        # Calculate session-based average attention/confusion if any
        recent_session = await db["sessions"].find_one({"class_id": c_id}, sort=[("started_at", -1)])
        avg_att = recent_session.get("avg_attention", 0.0) if recent_session else 0.0
        avg_conf = recent_session.get("avg_confusion", 0.0) if recent_session else 0.0
        active = recent_session.get("peak_students", 0) if recent_session and recent_session.get("status") == ClassStatus.LIVE.value else 0

        results.append(
            ClassOut(
                id=c_id,
                class_code=c["class_code"],
                name=c["name"],
                subject=c["subject"],
                description=c.get("description", ""),
                teacher_id=c["teacher_id"],
                teacher_name=c["teacher_name"],
                scheduled_start=c.get("scheduled_start"),
                scheduled_end=c.get("scheduled_end"),
                status=ClassStatus(c.get("status", ClassStatus.SCHEDULED.value)),
                enrolled_count=enrolled,
                active_students=active,
                avg_attention=avg_att,
                avg_confusion=avg_conf,
                created_at=c["created_at"].isoformat() if isinstance(c["created_at"], datetime) else str(c["created_at"]),
            )
        )
    return results


# ==========================================
# 2. STUDENT: ENROLLMENT & CLASSES
# ==========================================

@router.post("/join", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def join_class(
    data: JoinClassIn,
    current_user: dict = Depends(require_role(Role.student, Role.admin)),
):
    db = get_db()
    student_id = str(current_user["_id"])
    code = data.class_code.strip().upper()

    class_doc = await db["classes"].find_one({"class_code": code})
    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Class with code '{code}' not found")

    if class_doc.get("status") == ClassStatus.ENDED.value:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot join a class that has already ended")

    class_id = str(class_doc["_id"])

    # Prevent duplicate active enrollment
    existing = await db["enrollments"].find_one({
        "class_id": class_id,
        "student_id": student_id,
    })
    if existing:
        if existing.get("status") == EnrollmentStatus.ACTIVE.value:
            raise HTTPException(status.HTTP_409_CONFLICT, "Already enrolled in this class")
        # Reactivate dropped enrollment
        await db["enrollments"].update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": EnrollmentStatus.ACTIVE.value, "enrolled_at": datetime.now(timezone.utc)}}
        )
        return EnrollmentOut(
            id=str(existing["_id"]),
            class_id=class_id,
            class_code=class_doc["class_code"],
            class_name=class_doc["name"],
            subject=class_doc["subject"],
            teacher_name=class_doc["teacher_name"],
            status=EnrollmentStatus.ACTIVE,
            enrolled_at=datetime.now(timezone.utc).isoformat(),
            is_live=class_doc.get("status") == ClassStatus.LIVE.value,
        )

    now = datetime.now(timezone.utc)
    enroll_doc = {
        "class_id": class_id,
        "class_code": class_doc["class_code"],
        "student_id": student_id,
        "student_name": current_user.get("full_name", "Student"),
        "student_email": current_user.get("email", ""),
        "enrolled_at": now,
        "status": EnrollmentStatus.ACTIVE.value,
    }

    result = await db["enrollments"].insert_one(enroll_doc)

    return EnrollmentOut(
        id=str(result.inserted_id),
        class_id=class_id,
        class_code=class_doc["class_code"],
        class_name=class_doc["name"],
        subject=class_doc["subject"],
        teacher_name=class_doc["teacher_name"],
        status=EnrollmentStatus.ACTIVE,
        enrolled_at=now.isoformat(),
        is_live=class_doc.get("status") == ClassStatus.LIVE.value,
    )


@router.get("/student", response_model=List[EnrollmentOut])
async def list_student_classes(
    current_user: dict = Depends(require_role(Role.student, Role.admin)),
):
    db = get_db()
    student_id = str(current_user["_id"])

    cursor = db["enrollments"].find({
        "student_id": student_id,
        "status": EnrollmentStatus.ACTIVE.value,
    }).sort("enrolled_at", -1)
    enrollments = await cursor.to_list(length=100)

    results: List[EnrollmentOut] = []
    for e in enrollments:
        class_id = e["class_id"]
        class_doc = None
        if ObjectId.is_valid(class_id):
            class_doc = await db["classes"].find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            class_doc = await db["classes"].find_one({"class_code": e["class_code"]})

        is_live = class_doc.get("status") == ClassStatus.LIVE.value if class_doc else False
        name = class_doc["name"] if class_doc else "Unknown Class"
        subject = class_doc["subject"] if class_doc else "General"
        teacher = class_doc["teacher_name"] if class_doc else "Instructor"

        enrolled_time = e["enrolled_at"].isoformat() if isinstance(e["enrolled_at"], datetime) else str(e["enrolled_at"])

        results.append(
            EnrollmentOut(
                id=str(e["_id"]),
                class_id=class_id,
                class_code=e["class_code"],
                class_name=name,
                subject=subject,
                teacher_name=teacher,
                status=EnrollmentStatus(e.get("status", EnrollmentStatus.ACTIVE.value)),
                enrolled_at=enrolled_time,
                is_live=is_live,
            )
        )
    return results


@router.get("/student/stats", response_model=StudentStatsOut)
async def get_student_stats(
    current_user: dict = Depends(require_role(Role.student, Role.admin)),
):
    db = get_db()
    student_id = str(current_user["_id"])

    enrolled_count = await db["enrollments"].count_documents({
        "student_id": student_id,
        "status": EnrollmentStatus.ACTIVE.value,
    })

    cursor = db["session_participants"].find({"student_id": student_id})
    participations = await cursor.to_list(length=200)

    attended_count = len(participations)
    if attended_count > 0:
        valid_att = [p["avg_attention"] for p in participations if p.get("avg_attention", 0) > 0]
        valid_conf = [p["avg_confusion"] for p in participations if p.get("avg_confusion", 0) > 0]
        avg_att = round(sum(valid_att) / len(valid_att), 1) if valid_att else 0.0
        avg_conf = round(sum(valid_conf) / len(valid_conf), 1) if valid_conf else 0.0
    else:
        avg_att = 0.0
        avg_conf = 0.0

    return StudentStatsOut(
        total_classes_enrolled=enrolled_count,
        total_sessions_attended=attended_count,
        overall_avg_attention=avg_att,
        overall_avg_confusion=avg_conf,
    )


@router.get("/student/attendance", response_model=List[AttendanceRecordOut])
async def get_student_attendance(
    current_user: dict = Depends(require_role(Role.student, Role.admin)),
):
    db = get_db()
    student_id = str(current_user["_id"])

    cursor = db["session_participants"].find({"student_id": student_id}).sort("joined_at", -1)
    participations = await cursor.to_list(length=100)

    records: List[AttendanceRecordOut] = []
    for p in participations:
        class_doc = None
        if ObjectId.is_valid(p.get("class_id", "")):
            class_doc = await db["classes"].find_one({"_id": ObjectId(p["class_id"])})

        records.append(
            AttendanceRecordOut(
                session_id=p.get("session_id", ""),
                class_id=p.get("class_id", ""),
                class_name=class_doc["name"] if class_doc else "Live Class",
                class_code=class_doc["class_code"] if class_doc else "ROOM",
                teacher_name=class_doc["teacher_name"] if class_doc else "Teacher",
                joined_at=p["joined_at"].isoformat() if isinstance(p.get("joined_at"), datetime) else str(p.get("joined_at", "")),
                left_at=p["left_at"].isoformat() if isinstance(p.get("left_at"), datetime) else None,
                duration_seconds=p.get("duration_seconds", 0),
                avg_attention=p.get("avg_attention", 0.0),
                avg_confusion=p.get("avg_confusion", 0.0),
                status=p.get("status", "PRESENT"),
            )
        )
    return records


# ==========================================
# 3. CLASS LIFECYCLE & LIVE SESSIONS
# ==========================================

@router.post("/{class_id}/start", response_model=ClassOut)
async def start_class(
    class_id: str,
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    db = get_db()
    teacher_id = str(current_user["_id"])

    query = {"_id": ObjectId(class_id)} if ObjectId.is_valid(class_id) else {"class_code": class_id.upper()}
    class_doc = await db["classes"].find_one(query)

    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")

    if class_doc["teacher_id"] != teacher_id and current_user.get("role") != Role.admin.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to manage this class")

    now = datetime.now(timezone.utc)
    real_class_id = str(class_doc["_id"])

    # Update class to LIVE
    await db["classes"].update_one(
        {"_id": class_doc["_id"]},
        {"$set": {"status": ClassStatus.LIVE.value, "updated_at": now}}
    )

    # Create active session record
    session_doc = {
        "class_id": real_class_id,
        "class_code": class_doc["class_code"],
        "teacher_id": teacher_id,
        "started_at": now,
        "ended_at": None,
        "status": ClassStatus.LIVE.value,
        "avg_attention": 0.0,
        "avg_confusion": 0.0,
        "peak_students": 0,
    }
    await db["sessions"].insert_one(session_doc)

    enrolled = await db["enrollments"].count_documents({"class_id": real_class_id, "status": EnrollmentStatus.ACTIVE.value})

    return ClassOut(
        id=real_class_id,
        class_code=class_doc["class_code"],
        name=class_doc["name"],
        subject=class_doc["subject"],
        description=class_doc.get("description", ""),
        teacher_id=teacher_id,
        teacher_name=class_doc["teacher_name"],
        scheduled_start=class_doc.get("scheduled_start"),
        scheduled_end=class_doc.get("scheduled_end"),
        status=ClassStatus.LIVE,
        enrolled_count=enrolled,
        active_students=0,
        avg_attention=0.0,
        avg_confusion=0.0,
        created_at=class_doc["created_at"].isoformat() if isinstance(class_doc["created_at"], datetime) else str(class_doc["created_at"]),
    )


@router.post("/{class_id}/end", response_model=ClassOut)
async def end_class(
    class_id: str,
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    db = get_db()
    teacher_id = str(current_user["_id"])

    query = {"_id": ObjectId(class_id)} if ObjectId.is_valid(class_id) else {"class_code": class_id.upper()}
    class_doc = await db["classes"].find_one(query)

    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")

    if class_doc["teacher_id"] != teacher_id and current_user.get("role") != Role.admin.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to manage this class")

    now = datetime.now(timezone.utc)
    real_class_id = str(class_doc["_id"])

    # Update class to ENDED
    await db["classes"].update_one(
        {"_id": class_doc["_id"]},
        {"$set": {"status": ClassStatus.ENDED.value, "updated_at": now}}
    )

    # Finalize active session
    active_session = await db["sessions"].find_one({
        "class_id": real_class_id,
        "status": ClassStatus.LIVE.value,
    }, sort=[("started_at", -1)])

    if active_session:
        # Finalize participants
        participants = await db["session_participants"].find({"session_id": str(active_session["_id"])}).to_list(100)
        avg_att = round(sum(p.get("avg_attention", 0) for p in participants) / len(participants), 1) if participants else 0.0
        avg_conf = round(sum(p.get("avg_confusion", 0) for p in participants) / len(participants), 1) if participants else 0.0

        await db["sessions"].update_one(
            {"_id": active_session["_id"]},
            {
                "$set": {
                    "status": ClassStatus.ENDED.value,
                    "ended_at": now,
                    "avg_attention": avg_att,
                    "avg_confusion": avg_conf,
                }
            }
        )

        # Mark all present participants as LEFT
        await db["session_participants"].update_many(
            {"session_id": str(active_session["_id"]), "left_at": None},
            {"$set": {"left_at": now, "status": ParticipantStatus.LEFT.value}}
        )

    enrolled = await db["enrollments"].count_documents({"class_id": real_class_id, "status": EnrollmentStatus.ACTIVE.value})

    return ClassOut(
        id=real_class_id,
        class_code=class_doc["class_code"],
        name=class_doc["name"],
        subject=class_doc["subject"],
        description=class_doc.get("description", ""),
        teacher_id=teacher_id,
        teacher_name=class_doc["teacher_name"],
        scheduled_start=class_doc.get("scheduled_start"),
        scheduled_end=class_doc.get("scheduled_end"),
        status=ClassStatus.ENDED,
        enrolled_count=enrolled,
        active_students=0,
        avg_attention=0.0,
        avg_confusion=0.0,
        created_at=class_doc["created_at"].isoformat() if isinstance(class_doc["created_at"], datetime) else str(class_doc["created_at"]),
    )


# ==========================================
# 4. CLASS DETAILS, ROSTER & ANALYTICS
# ==========================================

@router.get("/webrtc-config", response_model=WebRTCConfigOut)
async def get_webrtc_config(current_user: dict = Depends(get_current_user)):
    """Returns dynamic WebRTC ICE server configurations (STUN and optional TURN)."""
    ice_servers = [
        ICEServerConfig(urls=[settings.webrtc_stun_server or "stun:stun.l.google.com:19302"])
    ]
    if settings.webrtc_turn_server:
        ice_servers.append(
            ICEServerConfig(
                urls=[settings.webrtc_turn_server],
                username=settings.webrtc_turn_username or None,
                credential=settings.webrtc_turn_credential or None,
            )
        )
    return WebRTCConfigOut(ice_servers=ice_servers)


@router.get("/{class_id_or_code}", response_model=ClassOut)
async def get_class_details(
    class_id_or_code: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {"_id": ObjectId(class_id_or_code)} if ObjectId.is_valid(class_id_or_code) else {"class_code": class_id_or_code.upper()}
    class_doc = await db["classes"].find_one(query)

    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Class '{class_id_or_code}' not found")

    real_class_id = str(class_doc["_id"])
    enrolled = await db["enrollments"].count_documents({"class_id": real_class_id, "status": EnrollmentStatus.ACTIVE.value})

    recent_session = await db["sessions"].find_one({"class_id": real_class_id}, sort=[("started_at", -1)])
    avg_att = recent_session.get("avg_attention", 0.0) if recent_session else 0.0
    avg_conf = recent_session.get("avg_confusion", 0.0) if recent_session else 0.0
    active = recent_session.get("peak_students", 0) if recent_session and recent_session.get("status") == ClassStatus.LIVE.value else 0

    return ClassOut(
        id=real_class_id,
        class_code=class_doc["class_code"],
        name=class_doc["name"],
        subject=class_doc["subject"],
        description=class_doc.get("description", ""),
        teacher_id=class_doc["teacher_id"],
        teacher_name=class_doc["teacher_name"],
        scheduled_start=class_doc.get("scheduled_start"),
        scheduled_end=class_doc.get("scheduled_end"),
        status=ClassStatus(class_doc.get("status", ClassStatus.SCHEDULED.value)),
        enrolled_count=enrolled,
        active_students=active,
        avg_attention=avg_att,
        avg_confusion=avg_conf,
        created_at=class_doc["created_at"].isoformat() if isinstance(class_doc["created_at"], datetime) else str(class_doc["created_at"]),
    )


@router.get("/{class_id_or_code}/students", response_model=List[StudentRosterItem])
async def get_class_students(
    class_id_or_code: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {"_id": ObjectId(class_id_or_code)} if ObjectId.is_valid(class_id_or_code) else {"class_code": class_id_or_code.upper()}
    class_doc = await db["classes"].find_one(query)

    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")

    real_class_id = str(class_doc["_id"])

    cursor = db["enrollments"].find({"class_id": real_class_id, "status": EnrollmentStatus.ACTIVE.value})
    enrollments = await cursor.to_list(length=200)

    # Active session if live
    active_session = await db["sessions"].find_one({"class_id": real_class_id, "status": ClassStatus.LIVE.value})
    session_id = str(active_session["_id"]) if active_session else None

    roster: List[StudentRosterItem] = []
    for e in enrollments:
        s_id = e["student_id"]
        participant = None
        if session_id:
            participant = await db["session_participants"].find_one({
                "session_id": session_id,
                "student_id": s_id,
            })

        is_online = participant is not None and participant.get("left_at") is None
        avg_att = participant.get("avg_attention", 0.0) if participant else 0.0
        avg_conf = participant.get("avg_confusion", 0.0) if participant else 0.0

        roster.append(
            StudentRosterItem(
                student_id=s_id,
                name=e.get("student_name", "Student"),
                email=e.get("student_email", ""),
                enrolled_at=e["enrolled_at"].isoformat() if isinstance(e.get("enrolled_at"), datetime) else str(e.get("enrolled_at", "")),
                status=e.get("status", EnrollmentStatus.ACTIVE.value),
                avg_attention=avg_att,
                avg_confusion=avg_conf,
                connection_status="ONLINE" if is_online else "OFFLINE",
                is_hand_raised=False,
            )
        )
    return roster


@router.get("/{class_id_or_code}/analytics", response_model=ClassAnalyticsOut)
async def get_class_analytics(
    class_id_or_code: str,
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    db = get_db()
    query = {"_id": ObjectId(class_id_or_code)} if ObjectId.is_valid(class_id_or_code) else {"class_code": class_id_or_code.upper()}
    class_doc = await db["classes"].find_one(query)

    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")

    real_class_id = str(class_doc["_id"])
    enrolled = await db["enrollments"].count_documents({"class_id": real_class_id, "status": EnrollmentStatus.ACTIVE.value})

    cursor = db["sessions"].find({"class_id": real_class_id}).sort("started_at", -1)
    sessions = await cursor.to_list(length=50)

    recent_sessions: List[SessionOut] = []
    total_att = 0.0
    total_conf = 0.0
    valid_sessions = 0

    for s in sessions:
        att = s.get("avg_attention", 0.0)
        conf = s.get("avg_confusion", 0.0)
        if att > 0:
            total_att += att
            total_conf += conf
            valid_sessions += 1

        recent_sessions.append(
            SessionOut(
                id=str(s["_id"]),
                class_id=real_class_id,
                class_code=class_doc["class_code"],
                status=ClassStatus(s.get("status", ClassStatus.ENDED.value)),
                started_at=s["started_at"].isoformat() if isinstance(s.get("started_at"), datetime) else str(s.get("started_at", "")),
                ended_at=s["ended_at"].isoformat() if isinstance(s.get("ended_at"), datetime) else None,
                avg_attention=att,
                avg_confusion=conf,
                peak_students=s.get("peak_students", 0),
            )
        )

    overall_att = round(total_att / valid_sessions, 1) if valid_sessions > 0 else 0.0
    overall_conf = round(total_conf / valid_sessions, 1) if valid_sessions > 0 else 0.0

    return ClassAnalyticsOut(
        class_id=real_class_id,
        class_code=class_doc["class_code"],
        class_name=class_doc["name"],
        total_enrolled=enrolled,
        total_sessions=len(sessions),
        overall_avg_attention=overall_att,
        overall_avg_confusion=overall_conf,
        recent_sessions=recent_sessions,
    )


# ==========================================
# 5. COMMUNICATION & REPORTING UPGRADES
# ==========================================

async def _get_authorized_class_doc(class_id_or_code: str, user: dict, db):
    """Fetches classroom and verifies requester is enrolled or teacher or admin."""
    query = {"_id": ObjectId(class_id_or_code)} if ObjectId.is_valid(class_id_or_code) else {"class_code": class_id_or_code.upper()}
    class_doc = await db["classes"].find_one(query)
    if not class_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Classroom not found")

    user_id = str(user["_id"])
    user_role = user.get("role", "")
    if user_role in [Role.admin.value, "admin"]:
        return class_doc
    if user_role in [Role.teacher.value, "teacher"] or str(class_doc.get("teacher_id")) == user_id:
        return class_doc

    # Check student enrollment
    enrolled = await db["enrollments"].find_one({
        "class_id": str(class_doc["_id"]),
        "student_id": user_id,
        "status": EnrollmentStatus.ACTIVE.value,
    })
    if not enrolled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not an authorized member of this classroom")
    return class_doc


@router.get("/{class_id_or_code}/messages", response_model=List[ChatMessageOut])
async def get_classroom_messages(
    class_id_or_code: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Retrieves paginated chat history for an authorized classroom."""
    db = get_db()
    class_doc = await _get_authorized_class_doc(class_id_or_code, current_user, db)
    class_code = class_doc["class_code"]

    query = {"class_code": class_code}
    if before:
        try:
            before_dt = datetime.fromisoformat(before)
            query["created_at"] = {"$lt": before_dt}
        except Exception:
            pass

    safe_limit = min(max(1, limit), 100)
    cursor = db["classroom_messages"].find(query).sort("created_at", -1).limit(safe_limit)
    messages = await cursor.to_list(length=safe_limit)

    messages.reverse()
    return [
        ChatMessageOut(
            id=str(m["_id"]),
            class_code=class_code,
            sender_id=str(m.get("sender_id", "")),
            sender_name=str(m.get("sender_name", "Anonymous")),
            sender_role=str(m.get("sender_role", "student")),
            text=str(m.get("text", "")),
            timestamp=m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", "")),
        )
        for m in messages
    ]


@router.post("/{class_id_or_code}/messages", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
async def send_classroom_message(
    class_id_or_code: str,
    data: ChatMessageIn,
    current_user: dict = Depends(get_current_user),
):
    """Sends a chat message to an authorized classroom and broadcasts to active WebSocket connections."""
    db = get_db()
    class_doc = await _get_authorized_class_doc(class_id_or_code, current_user, db)
    class_code = class_doc["class_code"]
    user_id = str(current_user["_id"])
    user_name = current_user.get("full_name", "User")
    user_role = current_user.get("role", "student")

    text = data.text.strip()[:1000]
    now = datetime.now(timezone.utc)
    doc = {
        "class_id": str(class_doc["_id"]),
        "class_code": class_code,
        "sender_id": user_id,
        "sender_name": user_name,
        "sender_role": user_role,
        "text": text,
        "created_at": now,
    }
    result = await db["classroom_messages"].insert_one(doc)
    msg_id = str(result.inserted_id)

    room_key = f"room_{class_code.lower()}"
    await manager.broadcast({
        "type": "chat_message",
        "id": msg_id,
        "class_code": class_code,
        "sender_id": user_id,
        "sender_name": user_name,
        "sender_role": user_role,
        "text": text,
        "timestamp": now.isoformat(),
    }, room_key)

    return ChatMessageOut(
        id=msg_id,
        class_code=class_code,
        sender_id=user_id,
        sender_name=user_name,
        sender_role=user_role,
        text=text,
        timestamp=now.isoformat(),
    )


@router.get("/{class_id_or_code}/screen-share-permission")
async def get_screen_share_permission(
    class_id_or_code: str,
    current_user: dict = Depends(get_current_user),
):
    """Returns current screen sharing permissions for this classroom."""
    db = get_db()
    class_doc = await _get_authorized_class_doc(class_id_or_code, current_user, db)
    class_code = class_doc["class_code"]
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "")

    perm = await db["screen_share_permissions"].find_one({"class_code": class_code})
    is_open_to_all = perm.get("is_open_to_all", False) if perm else False
    allowed_students = perm.get("allowed_students", []) if perm else []

    can_share = (
        (user_role in [Role.teacher.value, Role.admin.value, "teacher", "admin"])
        or (str(class_doc.get("teacher_id")) == user_id)
        or is_open_to_all
        or (user_id in allowed_students)
    )
    return {
        "class_code": class_code,
        "is_open_to_all": is_open_to_all,
        "allowed_students": allowed_students,
        "can_share": can_share,
    }


@router.post("/{class_id_or_code}/screen-share-permission")
async def update_screen_share_permission(
    class_id_or_code: str,
    data: ScreenSharePermissionUpdate,
    current_user: dict = Depends(require_role(Role.teacher, Role.admin)),
):
    """Teacher controls screen sharing: allow all students or grant/revoke for individual student."""
    db = get_db()
    class_doc = await _get_authorized_class_doc(class_id_or_code, current_user, db)
    class_code = class_doc["class_code"]

    perm = await db["screen_share_permissions"].find_one({"class_code": class_code})
    allowed_students = perm.get("allowed_students", []) if perm else []
    is_open = perm.get("is_open_to_all", False) if perm else False

    if data.is_open_to_all is not None:
        is_open = data.is_open_to_all

    if data.allowed_student_id:
        if data.action == "revoke" and data.allowed_student_id in allowed_students:
            allowed_students.remove(data.allowed_student_id)
        elif data.action == "grant" and data.allowed_student_id not in allowed_students:
            allowed_students.append(data.allowed_student_id)

    now = datetime.now(timezone.utc)
    await db["screen_share_permissions"].update_one(
        {"class_code": class_code},
        {"$set": {
            "class_id": str(class_doc["_id"]),
            "class_code": class_code,
            "is_open_to_all": is_open,
            "allowed_students": allowed_students,
            "updated_at": now,
        }},
        upsert=True,
    )

    room_key = f"room_{class_code.lower()}"
    await manager.broadcast({
        "type": "screen_share_permission",
        "is_open_to_all": is_open,
        "allowed_students": allowed_students,
        "updated_by": str(current_user["_id"]),
    }, room_key)

    return {
        "class_code": class_code,
        "is_open_to_all": is_open,
        "allowed_students": allowed_students,
        "updated_at": now.isoformat(),
    }


@router.get("/{class_id_or_code}/report-data")
async def get_classroom_report_data(
    class_id_or_code: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns authentic academic report data filtered by date range.
    Role-governed:
    - Teacher/Admin: Full class report including student roster and session breakdown.
    - Student: Strictly their own personal performance and attendance.
    """
    db = get_db()
    class_doc = await _get_authorized_class_doc(class_id_or_code, current_user, db)
    class_id = str(class_doc["_id"])
    class_code = class_doc["class_code"]
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "student")

    session_query = {"class_id": class_id}
    if start_date or end_date:
        date_filter = {}
        if start_date:
            try:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            except Exception:
                pass
        if end_date:
            try:
                date_filter["$lte"] = datetime.fromisoformat(end_date)
            except Exception:
                pass
        if date_filter:
            session_query["started_at"] = date_filter

    sessions_cursor = db["sessions"].find(session_query).sort("started_at", -1)
    sessions = await sessions_cursor.to_list(length=100)

    now_iso = datetime.now(timezone.utc).isoformat()
    date_range_str = f"{start_date or 'Earliest'} to {end_date or 'Latest'}" if (start_date or end_date) else "All Available History"
    limitations_notice = (
        "Notice: Metrics are calculated from real-time client-side facial landmark telemetry "
        "(EAR, Gaze, Head Pose, Brow Furrow) using Random Forest classification. Zero raw video frames "
        "are stored or transmitted. Intended for educational engagement analytics only."
    )

    if user_role in [Role.teacher.value, Role.admin.value]:
        enrolled_count = await db["enrollments"].count_documents({"class_id": class_id, "status": EnrollmentStatus.ACTIVE.value})
        total_att = 0.0
        total_conf = 0.0
        valid_sess = 0
        session_items: List[SessionSummaryItem] = []

        for s in sessions:
            att = s.get("avg_attention", 0.0)
            conf = s.get("avg_confusion", 0.0)
            if att > 0:
                total_att += att
                total_conf += conf
                valid_sess += 1
            session_items.append(
                SessionSummaryItem(
                    session_id=str(s["_id"]),
                    started_at=s["started_at"].isoformat() if isinstance(s.get("started_at"), datetime) else str(s.get("started_at", "")),
                    ended_at=s["ended_at"].isoformat() if isinstance(s.get("ended_at"), datetime) else None,
                    avg_attention=att,
                    avg_confusion=conf,
                    peak_students=s.get("peak_students", 0),
                )
            )

        enrollments_cursor = db["enrollments"].find({"class_id": class_id, "status": EnrollmentStatus.ACTIVE.value})
        enrollments = await enrollments_cursor.to_list(length=200)
        roster_items: List[StudentReportSummary] = []

        for e in enrollments:
            s_uid = e["student_id"]
            parts = await db["session_participants"].find({"class_id": class_id, "student_id": s_uid}).to_list(length=100)
            s_att = round(sum(p.get("avg_attention", 0.0) for p in parts) / len(parts), 1) if parts else 0.0
            s_conf = round(sum(p.get("avg_confusion", 0.0) for p in parts) / len(parts), 1) if parts else 0.0
            status_text = "PRESENT" if parts else "ABSENT"
            roster_items.append(
                StudentReportSummary(
                    student_id=s_uid,
                    student_name=e.get("student_name", "Student"),
                    student_email=e.get("student_email", ""),
                    attendance_status=status_text,
                    sessions_attended=len(parts),
                    avg_attention=s_att,
                    avg_confusion=s_conf,
                )
            )

        has_data = len(sessions) > 0 or len(roster_items) > 0
        overall_att = round(total_att / valid_sess, 1) if valid_sess > 0 else 0.0
        overall_conf = round(total_conf / valid_sess, 1) if valid_sess > 0 else 0.0

        return ClassReportDataOut(
            class_id=class_id,
            class_code=class_code,
            class_name=class_doc["name"],
            instructor_name=class_doc.get("teacher_name", "Instructor"),
            date_range=date_range_str,
            generated_at=now_iso,
            has_data=has_data,
            total_students_enrolled=enrolled_count,
            total_sessions_conducted=len(sessions),
            overall_avg_attention=overall_att,
            overall_avg_confusion=overall_conf,
            sessions=session_items,
            student_roster=roster_items,
            data_limitations_notice=limitations_notice,
        )

    else:
        parts = await db["session_participants"].find({"class_id": class_id, "student_id": user_id}).sort("joined_at", -1).to_list(length=100)
        s_att = round(sum(p.get("avg_attention", 0.0) for p in parts) / len(parts), 1) if parts else 0.0
        s_conf = round(sum(p.get("avg_confusion", 0.0) for p in parts) / len(parts), 1) if parts else 0.0

        student_sessions: List[SessionSummaryItem] = [
            SessionSummaryItem(
                session_id=str(p["session_id"]),
                started_at=p["joined_at"].isoformat() if isinstance(p.get("joined_at"), datetime) else str(p.get("joined_at", "")),
                ended_at=p["left_at"].isoformat() if isinstance(p.get("left_at"), datetime) else None,
                avg_attention=p.get("avg_attention", 0.0),
                avg_confusion=p.get("avg_confusion", 0.0),
                peak_students=1,
            )
            for p in parts
        ]

        has_data = len(parts) > 0
        explanations = {
            "attention_score": "Composite metric [0-100] based on screen gaze persistence, head posture stability, and regular blink frequency.",
            "confusion_score": "Composite metric [0-100] derived from prolonged eyebrow furrowing, head tilt deviation, and rapid gaze shifts.",
            "privacy": "Zero video or facial images are stored. Analysis is performed client-side using MediaPipe Face Mesh coordinates.",
        }

        return StudentPersonalReportOut(
            student_id=user_id,
            student_name=current_user.get("full_name", "Student"),
            student_email=current_user.get("email", ""),
            class_id=class_id,
            class_code=class_code,
            class_name=class_doc["name"],
            date_range=date_range_str,
            generated_at=now_iso,
            has_data=has_data,
            sessions_attended=len(parts),
            personal_avg_attention=s_att,
            personal_avg_confusion=s_conf,
            sessions=student_sessions,
            metric_explanations=explanations,
            data_limitations_notice=limitations_notice,
        )
