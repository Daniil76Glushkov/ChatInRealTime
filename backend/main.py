import json
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect


app = FastAPI(title="Чат")


def current_time() -> str:
    """Возвращает время сообщения в формате ISO 8601."""
    return datetime.now(timezone.utc).isoformat()


class ConnectionManager:
    """Хранит активные WebSocket-соединения по именам пользователей."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, username: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, username: str):
        self.active_connections.pop(username, None)

    async def broadcast(self, message: dict, exclude: str | None = None):
        """Отправляет одно JSON-сообщение всем участникам, кроме exclude."""
        for username, websocket in list(self.active_connections.items()):
            if username != exclude:
                try:
                    await websocket.send_json(message)
                except (WebSocketDisconnect, OSError):
                    continue


manager = ConnectionManager()


@app.get("/")
async def health_check():
    return {"message": "Чат запущен"}


@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.strip()

    if not username or len(username) > 30:
        await websocket.accept()
        await websocket.close(
            code=1008, reason="Имя должно содержать от 1 до 30 символов"
        )
        return

    if username in manager.active_connections:
        await websocket.accept()
        await websocket.close(code=1008, reason="Это имя уже занято. Выберите другое")
        return

    await manager.connect(username, websocket)
    try:
        await manager.broadcast(
            {
                "type": "system",
                "text": f"{username} присоединился к чату",
                "timestamp": current_time(),
            },
            exclude=username,
        )
        while True:
            try:
                message = await websocket.receive_json()
            except json.JSONDecodeError:
                continue

            if not isinstance(message, dict) or not isinstance(message.get("text"), str):
                continue

            text = message["text"].strip()

            if not text or len(text) > 500:
                continue

            await manager.broadcast(
                {
                    "type": "message",
                    "username": username,
                    "text": text,
                    "timestamp": current_time(),
                }
            )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(username)
        await manager.broadcast(
            {
                "type": "system",
                "text": f"{username} вышел из чата",
                "timestamp": current_time(),
            },
            exclude=username,
        )
