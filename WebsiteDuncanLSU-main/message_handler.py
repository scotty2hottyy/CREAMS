from typing import Any

from chatroom_host import ChatRoomHost
from friend_manager import FriendManager
from message_factory import MessageFactory
from session_manager import SessionManager
from website_io import WebsiteIO


class MessageHandler:
    """
    Processes chat, image, and friend messages.
    Uses MessageFactory to build all outgoing payloads.
    """

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

    async def handle_chat(self, ws: Any, text: str) -> None:
        room_name  = self.session_manager.get_room(ws)
        name       = self.session_manager.get_name(ws)
        clean_text = text.strip()

        if not room_name:
            await self.io_handler.send_system(ws, "Join a room first.")
            return
        if not clean_text:
            return

        await self.io_handler.broadcast_room(
            room_name,
            self.room_manager,
            MessageFactory.chat(room_name, name, clean_text),
        )

    async def handle_image(self, ws: Any, data_url: Any, mime: str) -> None:
        room_name = self.session_manager.get_room(ws)
        name      = self.session_manager.get_name(ws)

        if not room_name:
            await self.io_handler.send_system(ws, "Join a room first.")
            return
        if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
            await self.io_handler.send_system(ws, "Invalid image payload.")
            return

        await self.io_handler.broadcast_room(
            room_name,
            self.room_manager,
            MessageFactory.image(room_name, name, mime, data_url),
        )

    async def handle_friend_request(self, ws: Any, to_name: str) -> None:
        from_name = self.session_manager.get_name(ws)

        error = self.friend_manager.send_request(from_name, to_name)
        if error:
            await self.io_handler.send_system(ws, error)
            return

        target_ws = self.session_manager.find_by_name(to_name)
        if not target_ws:
            await self.io_handler.send_system(ws, f"{to_name} is not online.")
            self.friend_manager.decline_request(to_name, from_name)
            return

        await self.io_handler.send_system(ws, f"Friend request sent to {to_name}.")
        await self.io_handler.send_json(target_ws, MessageFactory.friend_request(from_name))

    async def handle_friend_response(self, ws: Any, from_name: str, accepted: bool) -> None:
        my_name = self.session_manager.get_name(ws)

        if accepted:
            ok = self.friend_manager.accept_request(my_name, from_name)
            if not ok:
                await self.io_handler.send_system(ws, "No pending request from that user.")
                return

            my_room = self.session_manager.get_room(ws)

            await self.io_handler.send_json(ws, MessageFactory.friend_accepted(from_name, None))

            requester_ws = self.session_manager.find_by_name(from_name)
            if requester_ws:
                await self.io_handler.send_json(
                    requester_ws,
                    MessageFactory.friend_accepted(my_name, my_room),
                )
        else:
            self.friend_manager.decline_request(my_name, from_name)
            await self.io_handler.send_system(ws, f"Declined friend request from {from_name}.")

    async def handle_friends_list(self, ws: Any) -> None:
        my_name = self.session_manager.get_name(ws)
        friends_out = []
        for fname in self.friend_manager.get_friends(my_name):
            fws  = self.session_manager.find_by_name(fname)
            room = self.session_manager.get_room(fws) if fws else None
            if not fws:
                status = "offline"
            elif room:
                status = "in_room"
            else:
                status = "in_lobby"
            friends_out.append({"name": fname, "status": status, "room": room})

        await self.io_handler.send_json(ws, MessageFactory.friends_list(
            friends_out,
            self.friend_manager.get_incoming_requests(my_name),
        ))