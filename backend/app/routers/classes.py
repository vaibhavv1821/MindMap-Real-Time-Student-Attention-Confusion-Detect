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
