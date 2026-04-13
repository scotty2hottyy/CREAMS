import asyncio
import json
from typing import Any

from chatroom_host import ChatRoomHost
from session_manager import SessionManager


class WebsiteIO:
    """Handles JSON input/output between the Python backend and the website."""

    async def send_json(self, ws: Any, payload: dict) -> None:
        await ws.send(json.dumps(payload))

    async def send_system(self, ws: Any, text: str) -> None:
        await self.send_json(ws, {"type": "system", "text": text})

    async def broadcast_to_clients(self, clients: list[Any], payload: dict) -> None:
        if not clients:
            return

        encoded_payload = json.dumps(payload)
        await asyncio.gather(
            *(client.send(encoded_payload) for client in clients),
            return_exceptions=True,
        )

    async def send_rooms(self, ws: Any, room_manager: ChatRoomHost) -> None:
        await self.send_json(ws, {"type": "rooms", "rooms": room_manager.get_room_list()})

    async def send_presence(self, ws: Any, session_manager: SessionManager) -> None:
        await self.send_json(
            ws,
            {"type": "presence", "online": session_manager.get_online_names()},
        )

    async def broadcast_rooms_to_all(
        self,
        session_manager: SessionManager,
        room_manager: ChatRoomHost,
    ) -> None:
        await self.broadcast_to_clients(
            session_manager.get_all_connections(),
            {"type": "rooms", "rooms": room_manager.get_room_list()},
        )

    async def broadcast_presence_to_all(self, session_manager: SessionManager) -> None:
        await self.broadcast_to_clients(
            session_manager.get_all_connections(),
            {"type": "presence", "online": session_manager.get_online_names()},
        )

    async def broadcast_room(
        self,
        room_name: str,
        room_manager: ChatRoomHost,
        payload: dict,
    ) -> None:
        await self.broadcast_to_clients(room_manager.get_room_clients(room_name), payload)
