from typing import Any

from chatroom_host import ChatRoomHost
from friend_manager import FriendManager
from session_manager import SessionManager
from website_io import WebsiteIO


class ChatRoomJoiner:
    """Handles joining rooms, switching rooms, and leaving rooms."""

    def __init__(
        self,
        io_handler: WebsiteIO,
        room_manager: ChatRoomHost,
        session_manager: SessionManager,
        friend_manager: FriendManager,
    ) -> None:
        self.io_handler      = io_handler
        self.room_manager    = room_manager
        self.session_manager = session_manager
        self.friend_manager  = friend_manager

    async def join_room(
        self,
        ws: Any,
        requested_name: str,
        requested_room: str,
        password: str | None = None,
        room_password: str | None = None,
    ) -> None:
        name      = requested_name.strip() or "Anonymous"
        room_name = requested_room.strip()

        if not room_name:
            await self.io_handler.send_system(ws, "Room name cannot be empty.")
            return

        current_name = self.session_manager.get_name(ws)
        if name != current_name and self.session_manager.is_name_taken(name, ws):
            await self.io_handler.send_system(
                ws,
                f"Name '{name}' is already online. Pick a different name.",
            )
            return

        if self.room_manager.room_exists(room_name):
            if not self.room_manager.check_password(room_name, password):
                await self.io_handler.send_system(ws, "Incorrect password for that room.")
                return
        else:
            self.room_manager.create_room(room_name, password=room_password or None)

        await self.leave_current_room(ws)

        self.session_manager.set_name(ws, name)
        self.room_manager.add_client_to_room(room_name, ws)
        self.session_manager.set_room(ws, room_name)

        await self.io_handler.send_system(ws, f"Joined room: {room_name}")
        await self.io_handler.broadcast_room(
            room_name,
            self.room_manager,
            {"type": "system", "text": f"{name} joined {room_name}"},
        )
        await self.io_handler.broadcast_rooms_to_all(self.session_manager, self.room_manager)
        await self.io_handler.broadcast_presence_to_all(self.session_manager)

        # Push live location update to everyone who has this user as a friend
        await self.io_handler.push_friends_updates_for(
            name, self.session_manager, self.friend_manager
        )

    async def leave_current_room(self, ws: Any) -> None:
        current_room = self.session_manager.get_room(ws)
        current_name = self.session_manager.get_name(ws)

        if not current_room:
            return

        self.room_manager.remove_client_from_room(current_room, ws)
        self.session_manager.set_room(ws, None)

        await self.io_handler.broadcast_room(
            current_room,
            self.room_manager,
            {"type": "system", "text": f"{current_name} left {current_room}"},
        )
        await self.io_handler.broadcast_rooms_to_all(self.session_manager, self.room_manager)

        # Push updated location (now None) to all of this user's friends
        await self.io_handler.push_friends_updates_for(
            current_name, self.session_manager, self.friend_manager
        )

        # Push an updated friends_list back to the user who just left
        # so their lobby view refreshes immediately
        await self.io_handler.push_friends_list_to(
            ws, current_name, self.session_manager, self.friend_manager
        )