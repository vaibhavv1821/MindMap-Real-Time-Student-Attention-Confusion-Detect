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

manager = TelemetryConnectionManager()

@router.websocket("/ws/{class_code}")
async def websocket_telemetry_endpoint(websocket: WebSocket, class_code: str):
    """
    WebSocket endpoint for real-time telemetry streaming.
    Receives derived numerical feature vectors and broadcasts to classroom dashboard.
    Zero video bytes accepted.
    """
    room_key = f"room_{class_code.lower()}"
    await manager.connect(websocket, room_key)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast processed numerical telemetry to teacher and classroom peers
            await manager.broadcast(data, room_key)

            # Persist real telemetry in MongoDB session participants if student telemetry
            if isinstance(data, dict) and "student_id" in data:
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
        manager.disconnect(websocket, room_key)