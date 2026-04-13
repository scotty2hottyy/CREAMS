import json
from typing import Any

import websockets

from chatroom_host import ChatRoomHost
from chatroom_join import ChatRoomJoiner
from discovery_service import DiscoveryService
from message_handler import MessageHandler
from session_manager import SessionManager
from website_io import WebsiteIO


class ChatServerController:
    """Coordinates websocket connections and routes requests to the correct class."""

    def __init__(self) -> None:
        self.io_handler = WebsiteIO()
        self.session_manager = SessionManager()
        self.room_manager = ChatRoomHost()
        self.discovery_service = DiscoveryService(self.room_manager, ws_port=6790)
        self.join_manager = ChatRoomJoiner(
            self.io_handler,
            self.room_manager,
            self.session_manager,
        )
        self.message_handler = MessageHandler(
            self.io_handler,
            self.room_manager,
            self.session_manager,
        )

    async def start(self) -> None:
        await self.discovery_service.start()

    async def stop(self) -> None:
        await self.discovery_service.stop()

    def get_rooms_payload(self) -> list[dict[str, Any]]:
        return self.discovery_service.get_combined_rooms()

    async def handle_connection(self, ws: Any) -> None:
        self.session_manager.register(ws)

        await self.io_handler.send_rooms(ws, self.get_rooms_payload())
        await self.io_handler.send_presence(ws, self.session_manager)
        await self.io_handler.broadcast_presence_to_all(self.session_manager)

        try:
            async for raw_message in ws:
                await self.route_message(ws, raw_message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.join_manager.leave_current_room(ws)
            self.session_manager.unregister(ws)
            await self.io_handler.broadcast_rooms_to_all(
                self.session_manager,
                self.get_rooms_payload(),
            )
            await self.io_handler.broadcast_presence_to_all(self.session_manager)

    async def route_message(self, ws: Any, raw_message: str) -> None:
        try:
            data = json.loads(raw_message)
        except json.JSONDecodeError:
            await self.io_handler.send_system(ws, "Invalid JSON format.")
            return

        message_type = data.get("type")

        if message_type == "list":
            await self.io_handler.send_rooms(ws, self.get_rooms_payload())
            return

        if message_type == "who":
            await self.io_handler.send_presence(ws, self.session_manager)
            return

        if message_type == "discover":
            await self.discovery_service.discover_now()
            await self.io_handler.send_rooms(ws, self.get_rooms_payload())
            return

        if message_type == "join":
            await self.join_manager.join_room(
                ws,
                data.get("name") or "Anonymous",
                data.get("room") or "",
            )
            await self.io_handler.broadcast_rooms_to_all(
                self.session_manager,
                self.get_rooms_payload(),
            )
            return

        if message_type == "chat":
            await self.message_handler.handle_chat(ws, data.get("text") or "")
            return

        if message_type == "image":
            await self.message_handler.handle_image(
                ws,
                data.get("dataUrl"),
                data.get("mime", ""),
            )
            return

        await self.io_handler.send_system(ws, f"Unknown message type: {message_type}")
