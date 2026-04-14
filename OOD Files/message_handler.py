from typing import Any

from chatroom_host import ChatRoomHost
from friend_manager import FriendManager
from session_manager import SessionManager
from website_io import WebsiteIO


class MessageHandler:
    """Processes chat messages, image messages, and friend requests."""

    def __init__(
        self,
        io_handler: WebsiteIO,
        room_manager: ChatRoomHost,
        session_manager: SessionManager,
        friend_manager: FriendManager,
    ) -> None:
        self.io_handler = io_handler
        self.room_manager = room_manager
        self.session_manager = session_manager
        self.friend_manager = friend_manager

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

    async def handle_friend_request(self, ws: Any, to_name: str) -> None:
        """Send a friend request to another online user."""
        from_name = self.session_manager.get_name(ws)

        error = self.friend_manager.send_request(from_name, to_name)
        if error:
            await self.io_handler.send_system(ws, error)
            return

        # Check if the target user is online
        target_ws = self.session_manager.find_by_name(to_name)
        if not target_ws:
            await self.io_handler.send_system(ws, f"{to_name} is not online.")
            self.friend_manager.decline_request(to_name, from_name)
            return

        await self.io_handler.send_system(ws, f"Friend request sent to {to_name}.")

        # Push the incoming request to the target user
        await self.io_handler.send_json(target_ws, {
            "type": "friend_request",
            "from": from_name,
        })

    async def handle_friend_response(self, ws: Any, from_name: str, accepted: bool) -> None:
        """Accept or decline a friend request."""
        my_name = self.session_manager.get_name(ws)

        if accepted:
            ok = self.friend_manager.accept_request(my_name, from_name)
            if not ok:
                await self.io_handler.send_system(ws, "No pending request from that user.")
                return

            my_room = self.session_manager.get_room(ws)

            # Notify the person who accepted
            await self.io_handler.send_json(ws, {
                "type": "friend_accepted",
                "friend": from_name,
                "friends": self.friend_manager.get_friends(my_name),
            })

            # Notify the original requester if they're still online
            requester_ws = self.session_manager.find_by_name(from_name)
            if requester_ws:
                await self.io_handler.send_json(requester_ws, {
                    "type": "friend_accepted",
                    "friend": my_name,
                    "room": my_room,
                    "friends": self.friend_manager.get_friends(from_name),
                })
        else:
            self.friend_manager.decline_request(my_name, from_name)
            await self.io_handler.send_system(ws, f"Declined friend request from {from_name}.")

    async def handle_friends_list(self, ws: Any) -> None:
        """Send the current user's friend list with room info."""
        my_name = self.session_manager.get_name(ws)
        friends = self.friend_manager.get_friends(my_name)

        friends_out = []
        for fname in friends:
            fws  = self.session_manager.find_by_name(fname)
            room = self.session_manager.get_room(fws) if fws else None
            if not fws:
                status = "offline"
            elif room:
                status = "in_room"
            else:
                status = "in_lobby"
            friends_out.append({"name": fname, "status": status, "room": room})

        await self.io_handler.send_json(ws, {
            "type":     "friends_list",
            "friends":  friends_out,
            "requests": self.friend_manager.get_incoming_requests(my_name),
        })