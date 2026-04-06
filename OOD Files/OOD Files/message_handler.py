from typing import Any

from chatroom_host import ChatRoomHost
from session_manager import SessionManager
from website_io import WebsiteIO


class MessageHandler:
    """Processes chat messages and image messages for the active room."""

    def __init__(
        self,
        io_handler: WebsiteIO,
        room_manager: ChatRoomHost,
        session_manager: SessionManager,
    ) -> None:
        self.io_handler = io_handler
        self.room_manager = room_manager
        self.session_manager = session_manager

    async def handle_chat(self, ws: Any, text: str) -> None:
        room_name = self.session_manager.get_room(ws)
        name = self.session_manager.get_name(ws)
        clean_text = text.strip()

        if not room_name:
            await self.io_handler.send_system(ws, "Join a room first.")
            return
        if not clean_text:
            return

        await self.io_handler.broadcast_room(
            room_name,
            self.room_manager,
            {
                "type": "chat",
                "room": room_name,
                "name": name,
                "text": clean_text,
            },
        )

    async def handle_image(self, ws: Any, data_url: Any, mime: str) -> None:
        room_name = self.session_manager.get_room(ws)
        name = self.session_manager.get_name(ws)

        if not room_name:
            await self.io_handler.send_system(ws, "Join a room first.")
            return
        if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
            await self.io_handler.send_system(ws, "Invalid image payload.")
            return

        await self.io_handler.broadcast_room(
            room_name,
            self.room_manager,
            {
                "type": "image",
                "room": room_name,
                "name": name,
                "mime": mime,
                "dataUrl": data_url,
            },
        )
