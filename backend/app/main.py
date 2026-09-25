from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import connect_db, close_db
from app.routers import auth, features, ml, classes

logger = logging.getLogger("mindmap.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    if hasattr(settings, "mongodb_uri") and settings.mongodb_uri:
        try:
            await connect_db()
            logger.info(f"[MindMap] MongoDB connected successfully. Database: {settings.db_name}")
        except Exception as e:
            logger.warning(f"[MindMap] MongoDB connection deferred (running in decoupled mode): {e}")
    else:
        logger.info("[MindMap] MongoDB connection deferred (MONGODB_URI not configured, running in decoupled mode).")
    yield
    try:
        await close_db()
    except Exception:
        pass


app = FastAPI(
    title="MindMap ~ Real-Time Student Attention & Confusion Detector",
    description="Custom Intelligence Layer on top of MediaPipe Face Mesh. Features EAR, Gaze, Head Pose, Blinks & Brow telemetry.",
    version="1.0.0 (Phase 1 Custom Feature Engine)",
    lifespan=lifespan
)

# CORS Middleware (Configurable via FRONTEND_URL and CORS_ORIGINS)
origins = settings.get_cors_origins() if hasattr(settings, "get_cors_origins") else getattr(settings, "cors_origins", [])
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https:\/\/.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(auth.router, prefix="/api")
app.include_router(classes.router)
app.include_router(classes.router, prefix="/api")
app.include_router(features.router)
app.include_router(ml.router)

# Root Endpoint
@app.get("/")
async def root():
    return {
        "status": "OK",
        "system": "MindMap ~ Real-Time Student Attention & Confusion Detector",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
        "database": settings.db_name,
        "phase": "Full-Stack Production Release",
    }


# Health & Privacy Guarantees
@app.get("/health")
@app.get("/api/health")
async def health():
    from app.db.mongodb import ping_db
    is_connected = await ping_db()
    return {
        "status": "OK",
        "system": "MindMap Real-Time AI Attention & Confusion Backend",
        "database": {
            "status": "CONNECTED" if is_connected else "DISCONNECTED",
            "name": settings.db_name,
            "provider": "MongoDB Atlas" if is_connected else "Decoupled / None",
        },
        "architecture": "FastAPI + NumPy + MediaPipe Feature Layer",
        "privacy": "Zero Raw Video Frames Accepted (100% Client-Side FaceMesh Processing)",
        "phase": "Phase 3 - Final Evaluation + Teacher Analytics + Presentation Readiness",
    }


@app.get("/health/db")
@app.get("/api/health/db")
async def health_db():
    from app.db.mongodb import ping_db
    is_connected = await ping_db()
    return {
        "status": "CONNECTED" if is_connected else "DISCONNECTED",
        "database": settings.db_name,
        "provider": "MongoDB Atlas" if is_connected else "Decoupled / None",
        "ping": "PONG" if is_connected else "FAILED",
    }


# Top-level WebSocket route for ws://localhost:8000/ws
@app.websocket("/ws")
@app.websocket("/ws/telemetry")
async def top_level_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Echo processed telemetry acknowledgment
            await websocket.send_json({
                "status": "received",
                "timestamp": data.get("timestamp"),
                "features_acknowledged": True
            })
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/{class_code}")
async def top_level_class_ws(websocket: WebSocket, class_code: str):
    from app.routers.features import websocket_telemetry_endpoint
    await websocket_telemetry_endpoint(websocket, class_code)