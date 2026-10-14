from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from app.schemas.features import (
    FeatureExtractionRequest,
    FacialFeatureVector,
    TelemetryMessage,
)
from app.features.feature_extractor import extractor_engine

router = APIRouter(prefix="/api/features", tags=["Facial Features"])

@router.post("/extract", response_model=FacialFeatureVector)
async def extract_facial_features(request: FeatureExtractionRequest):
    """
    Primary Feature Extraction Endpoint.
    Consumes raw MediaPipe 468/478 landmarks and returns our derived
    behavioral feature vector (EAR, Gaze, Head Pose, Blinks, Brow Contraction).
    """
    return extractor_engine.extract_features(request.landmarks, request.timestamp_ms)

@router.get("/info")
async def get_feature_engine_info():
    """
    Returns architectural specifications and mathematical formulations
    of MindMap's Custom Intelligence Layer.
    """
    return {
        "engine": "MindMap Custom Facial Feature Extraction Engine",
        "phase": "Phase 1 - Custom Feature Engineering Foundation",
        "privacy": "100% Client-Side Landmark Inference. Zero Raw Video Bytes Stored/Transmitted.",
        "input": "MediaPipe Face Mesh (468 or 478 normalized 3D landmarks)",
        "output": "Standardized Numerical Behavioral Feature Vector",
        "metrics": {
            "EAR": {
                "formula": "EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)",
                "reference": "Soukupova & Cech (2016)",
                "topology": {
                    "left_eye": [33, 160, 158, 133, 153, 144],
                    "right_eye": [362, 385, 387, 263, 373, 380]
                }
            },
            "Blink": {
                "mechanism": "State machine with physiological duration filter [60ms, 450ms]",
                "outputs": ["blink_detected", "blink_count", "blink_rate_per_min", "closure_duration_ms"]
            },
            "Gaze": {
                "mechanism": "Pupil / Iris coordinate position normalized against eye canthi boundaries",
                "classes": ["CENTER", "LEFT", "RIGHT", "UP", "DOWN", "AWAY"],
                "deviation": "Euclidean distance from ocular center (0.5, 0.5) scaled [0, 1]"
            },
            "HeadPose": {
                "mechanism": "3D landmark spatial trigonometry",
                "degrees": ["head_yaw (-90 to +90)", "head_pitch (-90 to +90)", "head_roll (-90 to +90)"]
            },
            "Brow": {
                "furrow": "Inter-eyebrow distance normalized by inter-ocular distance",
                "score": "Normalized contraction index [0=relaxed, 1=furrowed/confused]",
                "raise": "Vertical brow elevation relative to eye midpoint"
            }
        }
    }


# Active WebSocket connections grouped by classroom code
class TelemetryConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_key: str):
        await websocket.accept()
        if room_key not in self.active_rooms:
            self.active_rooms[room_key] = []
        self.active_rooms[room_key].append(websocket)

    def disconnect(self, websocket: WebSocket, room_key: str):
        if room_key in self.active_rooms:
            if websocket in self.active_rooms[room_key]:
                self.active_rooms[room_key].remove(websocket)
            if not self.active_rooms[room_key]:
                del self.active_rooms[room_key]

    async def broadcast(self, message: dict, room_key: str):
        if room_key in self.active_rooms:
            for connection in self.active_rooms[room_key]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

from app.features.connection_manager import manager, ClassroomConnectionManager

TelemetryConnectionManager = ClassroomConnectionManager

@router.websocket("/ws/{class_code}")
async def websocket_telemetry_endpoint(websocket: WebSocket, class_code: str):
    """
    WebSocket endpoint for real-time classroom telemetry, chat, and WebRTC signaling.
    Zero video bytes accepted. Signaling and numerical telemetry only.
    """
    room_key = f"room_{class_code.lower()}"
    await manager.connect(websocket, room_key)
    try:
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                continue

            msg_type = data.get("type")

            # 1. User Join / Introduction event
            if msg_type == "join" or data.get("event") == "join":
                user_id = str(data.get("user_id") or data.get("peer_id") or "")
                user_name = str(data.get("user_name") or data.get("peer_name") or "User")
                user_role = str(data.get("user_role") or data.get("peer_role") or "student")
                token = data.get("token")
                from app.core.security import decode_token
                from app.db.mongodb import get_db
                db = get_db()
                code_clean = class_code.strip().upper()

                if token:
                    payload = decode_token(token)
                    if payload and "sub" in payload:
                        user_id = payload["sub"]
                        user_role = payload.get("role", user_role)

                # Check classroom authorization in database
                is_authorized = False
                class_doc = await db["classes"].find_one({"class_code": code_clean})
                if class_doc:
                    if user_role == "admin" or str(class_doc.get("teacher_id")) == str(user_id):
                        is_authorized = True
                        if str(class_doc.get("teacher_id")) == str(user_id) and user_role != "admin":
                            user_role = "teacher"
                    else:
                        enrolled = await db["enrollments"].find_one({
                            "class_id": str(class_doc["_id"]),
                            "student_id": user_id,
                            "status": "ACTIVE",
                        })
                        if enrolled:
                            is_authorized = True
                else:
                    # Permissive fallback if classroom not found or in test mode
                    is_authorized = True

                manager.register_user(websocket, {
                    "user_id": user_id,
                    "user_name": user_name,
                    "user_role": user_role,
                    "is_authorized": is_authorized,
                    "class_code": code_clean,
                })
                await manager.broadcast({
                    "type": "peer_joined",
                    "peer_id": user_id,
                    "peer_name": user_name,
                    "peer_role": user_role,
                }, room_key, exclude=websocket)
                continue

            # Query existing peers in the classroom
            elif msg_type == "get_peers":
                existing_peers = []
                for ws in manager.active_rooms.get(room_key, []):
                    if ws != websocket:
                        info = manager.get_user_info(ws)
                        if info and info.get("user_id"):
                            existing_peers.append({
                                "peer_id": info["user_id"],
                                "peer_name": info.get("user_name", "User"),
                                "peer_role": info.get("user_role", "student"),
                            })
                await websocket.send_json({
                    "type": "room_peers",
                    "peers": existing_peers,
                })
                continue

            # 2. Classroom Chat Message
            elif msg_type == "chat_message":
                text = str(data.get("text", "")).strip()
                if text:
                    text = text[:1000]
                    from app.db.mongodb import get_db
                    from datetime import datetime, timezone
                    db = get_db()
                    now = datetime.now(timezone.utc)
                    code_clean = class_code.strip().upper()

                    user_info = manager.get_user_info(websocket) or {}
                    sender_id = user_info.get("user_id") or str(data.get("sender_id", ""))
                    sender_name = user_info.get("user_name") or str(data.get("sender_name", "Anonymous"))
                    sender_role = user_info.get("user_role") or str(data.get("sender_role", "student"))

                    # Enforce authorization
                    if not user_info.get("is_authorized", False):
                        class_doc = await db["classes"].find_one({"class_code": code_clean})
                        if class_doc:
                            is_auth = (
                                sender_role == "admin"
                                or class_doc.get("teacher_id") == sender_id
                                or bool(await db["enrollments"].find_one({
                                    "class_id": str(class_doc["_id"]),
                                    "student_id": sender_id,
                                    "status": "ACTIVE",
                                }))
                            )
                            if not is_auth:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "You are not an authorized member of this classroom.",
                                })
                                continue

                    msg_doc = {
                        "class_code": code_clean,
                        "sender_id": sender_id,
                        "sender_name": sender_name,
                        "sender_role": sender_role,
                        "text": text,
                        "created_at": now,
                    }
                    try:
                        res = await db["classroom_messages"].insert_one(msg_doc)
                        msg_id = str(res.inserted_id)
                    except Exception:
                        msg_id = str(now.timestamp())

                    await manager.broadcast({
                        "type": "chat_message",
                        "id": msg_id,
                        "class_code": code_clean,
                        "sender_id": sender_id,
                        "sender_name": sender_name,
                        "sender_role": sender_role,
                        "text": text,
                        "timestamp": now.isoformat(),
                        "temp_id": data.get("temp_id"),
                    }, room_key)
                continue

            # 3. WebRTC Peer Signaling (Offer / Answer / ICE Candidate)
            elif msg_type == "webrtc_signal":
                await manager.broadcast({
                    "type": "webrtc_signal",
                    "target_id": data.get("target_id"),
                    "sender_id": data.get("sender_id"),
                    "sender_name": data.get("sender_name"),
                    "sender_role": data.get("sender_role"),
                    "signal": data.get("signal"),
                }, room_key, exclude=websocket)
                continue

            # 4. Media Device / Status changes (mic, camera, screen share)
            elif msg_type == "peer_status":
                from app.db.mongodb import get_db
                db = get_db()
                code_clean = class_code.strip().upper()
                class_doc = await db["classes"].find_one({"class_code": code_clean})

                user_info = manager.get_user_info(websocket) or {}
                peer_id = user_info.get("user_id") or str(data.get("peer_id", ""))
                peer_name = user_info.get("user_name") or str(data.get("peer_name", "User"))
                peer_role = user_info.get("user_role") or str(data.get("peer_role") or data.get("user_role") or "student")
                is_sharing = bool(data.get("is_screen_sharing", False))

                is_teacher_or_admin = (
                    peer_role in ["teacher", "admin"]
                    or (class_doc and str(class_doc.get("teacher_id")) == str(peer_id))
                )
                effective_role = "teacher" if (is_teacher_or_admin and peer_role != "admin") else peer_role

                # Backend screen share permission enforcement:
                # Teachers/admins are ALWAYS authorized to share screen.
                # Student screen share setting (open_to_all) applies strictly to students.
                if is_sharing and not is_teacher_or_admin:
                    perm = await db["screen_share_permissions"].find_one({"class_code": code_clean})
                    is_open = perm.get("is_open_to_all", False) if perm else False
                    allowed = perm.get("allowed_students", []) if perm else []

                    if not is_open and peer_id not in allowed:
                        is_sharing = False
                        await websocket.send_json({
                            "type": "permission_denied",
                            "action": "screen_share",
                            "message": "Screen sharing has not been granted by the teacher.",
                        })

                if user_info:
                    user_info["user_role"] = effective_role
                    user_info["user_id"] = peer_id
                    user_info["user_name"] = peer_name

                await manager.broadcast({
                    "type": "peer_status",
                    "peer_id": peer_id,
                    "peer_name": peer_name,
                    "peer_role": effective_role,
                    "is_camera_on": data.get("is_camera_on", True),
                    "is_mic_on": data.get("is_mic_on", True),
                    "is_screen_sharing": is_sharing,
                }, room_key, exclude=websocket)
                continue

            # 5. Screen Share Permission updates (teacher controlled)
            elif msg_type == "screen_share_permission":
                user_info = manager.get_user_info(websocket) or {}
                peer_id = user_info.get("user_id") or str(data.get("peer_id", ""))
                peer_role = user_info.get("user_role") or str(data.get("peer_role") or data.get("user_role") or "student")
                from app.db.mongodb import get_db
                db = get_db()
                code_clean = class_code.strip().upper()
                class_doc = await db["classes"].find_one({"class_code": code_clean})

                is_teacher_or_admin = (
                    peer_role in ["teacher", "admin"]
                    or (class_doc and str(class_doc.get("teacher_id")) == str(peer_id))
                )
                if not is_teacher_or_admin:
                    await websocket.send_json({
                        "type": "permission_denied",
                        "action": "screen_share_permission",
                        "message": "Only teachers can modify screen sharing permissions.",
                    })
                    continue

                from app.db.mongodb import get_db
                from datetime import datetime, timezone
                db = get_db()
                code_clean = class_code.strip().upper()
                now = datetime.now(timezone.utc)
                is_open = bool(data.get("is_open_to_all", False))
                allowed = data.get("allowed_students", [])

                await db["screen_share_permissions"].update_one(
                    {"class_code": code_clean},
                    {"$set": {
                        "class_code": code_clean,
                        "is_open_to_all": is_open,
                        "allowed_students": allowed,
                        "updated_at": now,
                    }},
                    upsert=True
                )

                await manager.broadcast({
                    "type": "screen_share_permission",
                    "is_open_to_all": is_open,
                    "allowed_students": allowed,
                    "updated_by": user_info.get("user_id"),
                }, room_key, exclude=websocket)
                continue

            # 6. Legacy / AI Telemetry Streaming
            await manager.broadcast(data, room_key)

            # Persist real telemetry in MongoDB session participants if student telemetry
            if "student_id" in data:
                try:
                    from app.db.mongodb import get_db
                    from datetime import datetime, timezone
                    db = get_db()
                    now = datetime.now(timezone.utc)
                    code_clean = class_code.strip().upper()
                    active_session = await db["sessions"].find_one({
                        "class_code": code_clean,
                        "status": "LIVE"
                    })
                    if active_session:
                        s_id = str(active_session["_id"])
                        await db["session_participants"].update_one(
                            {"session_id": s_id, "student_id": str(data["student_id"])},
                            {
                                "$set": {
                                    "avg_attention": float(data.get("attention_score", 0)),
                                    "avg_confusion": float(data.get("confusion_score", 0)),
                                    "student_name": data.get("student_name", "Student"),
                                    "student_email": data.get("student_email", ""),
                                    "status": "PRESENT"
                                },
                                "$setOnInsert": {
                                    "joined_at": now,
                                    "class_id": active_session["class_id"]
                                }
                            },
                            upsert=True
                        )
                except Exception:
                    pass
    except WebSocketDisconnect:
        user_info = manager.disconnect(websocket, room_key)
        if user_info and user_info.get("user_id"):
            try:
                await manager.broadcast({
                    "type": "peer_left",
                    "peer_id": user_info["user_id"],
                    "peer_name": user_info.get("user_name"),
                }, room_key)
            except Exception:
                pass