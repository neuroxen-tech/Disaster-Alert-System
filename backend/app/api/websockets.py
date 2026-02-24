import asyncio
from fastapi import APIRouter, WebSocket
from app.services.websocket_manager import ConnectionManager
import app.state as state

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await manager.broadcast(state.cached_data)
            await asyncio.sleep(2)
    except:
        manager.disconnect(websocket)
