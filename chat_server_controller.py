import json
from typing import Any

import websockets

from chatroom_host import ChatRoomHost
from message_factory import MessageFactory
from chatroom_join import ChatRoomJoiner
from friend_manager import FriendManager
from message_handler import MessageHandler
from session_manager import SessionManager
from website_io import WebsiteIO


class ChatServerController:
    """Coordinates websocket connections and routes requests to the correct class."""

    def __init__(self) -> None:
        self.io_handler = WebsiteIO()
        self.session_manager = SessionManager()
        self.room_manager = ChatRoomHost()
        self.friend_manager = FriendManager()
        self.join_manager = ChatRoomJoiner(
            self.io_handler,
            self.room_manager,
            self.session_manager,
            self.friend_manager,
        )
        self.message_handler = MessageHandler(
            self.io_handler,
            self.room_manager,
            self.session_manager,
            self.friend_manager,
        )

    async def handle_connection(self, ws: Any) -> None:
        self.session_manager.register(ws)

        await self.io_handler.send_rooms(ws, self.room_manager)
        await self.io_handler.send_presence(ws, self.session_manager)
        await self.io_handler.broadcast_presence_to_all(self.session_manager)

        try:
            async for raw_message in ws:
                await self.route_message(ws, raw_message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            name = self.session_manager.get_name(ws)
            # Leave room and push friend updates BEFORE cleanup so friends list is intact
            await self.join_manager.leave_current_room(ws)
            await self.io_handler.push_friends_updates_for(name, self.session_manager, self.friend_manager)
            self.friend_manager.cleanup_user(name)
            self.session_manager.unregister(ws)
            await self.io_handler.broadcast_rooms_to_all(self.session_manager, self.room_manager)
            await self.io_handler.broadcast_presence_to_all(self.session_manager)

    async def route_message(self, ws: Any, raw_message: str) -> None:
        try:
            data = json.loads(raw_message)
        except json.JSONDecodeError:
            await self.io_handler.send_system(ws, "Invalid JSON format.")
            return

        message_type = data.get("type")

        if message_type == "list":
            await self.io_handler.send_rooms(ws, self.room_manager)
            return

        if message_type == "who":
            await self.io_handler.send_presence(ws, self.session_manager)
            return

        if message_type == "set_name":
            requested = (data.get("name") or "").strip()
            if not requested:
                await self.io_handler.send_system(ws, "Name cannot be empty.")
                return
            if self.session_manager.is_name_taken(requested, ws):
                await self.io_handler.send_json(ws, {"type": "name_rejected", "reason": f"\'{requested}\' is already taken."})
                return
            old_name = self.session_manager.get_name(ws)
            self.session_manager.set_name(ws, requested)
            # Update friendship records to use the new name
            self.friend_manager.rename_user(old_name, requested)
            await self.io_handler.send_json(ws, MessageFactory.name_confirmed(requested))
            await self.io_handler.broadcast_presence_to_all(self.session_manager)
            # Push to all friends (now stored under new name)
            await self.io_handler.push_friends_updates_for(requested, self.session_manager, self.friend_manager)
            # Also send the user themselves an updated list
            await self.io_handler.push_friends_list_to(ws, requested, self.session_manager, self.friend_manager)
            room = self.session_manager.get_room(ws)
            if room and old_name != requested:
                await self.io_handler.broadcast_room(
                    room, self.room_manager,
                    {"type": "system", "text": f"{old_name} is now known as {requested}"},
                )
            return

        if message_type == "join":
            await self.join_manager.join_room(
                ws,
                data.get("name") or "Anonymous",
                data.get("room") or "",
                password=data.get("password") or None,
                room_password=data.get("roomPassword") or None,
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

        if message_type == "friend_request":
            await self.message_handler.handle_friend_request(ws, data.get("to") or "")
            return

        if message_type == "friend_response":
            await self.message_handler.handle_friend_response(
                ws,
                data.get("from") or "",
                bool(data.get("accepted")),
            )
            return

        if message_type == "friends_list":
            await self.message_handler.handle_friends_list(ws)
            return

        await self.io_handler.send_system(ws, f"Unknown message type: {message_type}")