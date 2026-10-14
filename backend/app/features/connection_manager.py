import logging
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger("mindmap.websocket")


class ClassroomConnectionManager:
    """
    Unified WebSocket Connection & Communication Manager for MindMap classrooms.
    Manages active room subscriptions, peer WebRTC signaling routing,
    chat message broadcasts, telemetry fan-out, and disconnection events.
    """

    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}
        self.socket_users: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, room_key: str):
        await websocket.accept()
        if room_key not in self.active_rooms:
            self.active_rooms[room_key] = []
        self.active_rooms[room_key].append(websocket)
        logger.debug(f"[WebSocket] Connected to {room_key}. Total in room: {len(self.active_rooms[room_key])}")

    def register_user(self, websocket: WebSocket, user_info: dict):
        self.socket_users[websocket] = user_info

    def get_user_info(self, websocket: WebSocket) -> Optional[dict]:
        return self.socket_users.get(websocket)

    def disconnect(self, websocket: WebSocket, room_key: str) -> Optional[dict]:
        user_info = self.socket_users.pop(websocket, None)
        if room_key in self.active_rooms:
            if websocket in self.active_rooms[room_key]:
                self.active_rooms[room_key].remove(websocket)
            if not self.active_rooms[room_key]:
                del self.active_rooms[room_key]
        logger.debug(f"[WebSocket] Disconnected from {room_key}. User: {user_info}")
        return user_info

    async def broadcast(self, message: dict, room_key: str, exclude: Optional[WebSocket] = None):
        if room_key not in self.active_rooms:
            return
        dead_connections = []
        for connection in list(self.active_rooms[room_key]):
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[WebSocket] Send failed, marking dead connection: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead, room_key)


manager = ClassroomConnectionManager()
