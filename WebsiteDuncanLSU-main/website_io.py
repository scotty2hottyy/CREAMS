import asyncio
import json
from typing import Any, TYPE_CHECKING

from chatroom_host import ChatRoomHost
from message_factory import MessageFactory
from session_manager import SessionManager
from singleton import SingletonMeta

if TYPE_CHECKING:
    from friend_manager import FriendManager


class WebsiteIO(metaclass=SingletonMeta):
    """
    Singleton Pattern: one broadcaster for the whole server.
    Facade Pattern: wraps all JSON encoding and asyncio complexity
    behind simple send/broadcast methods.
    """

    async def send_json(self, ws: Any, payload: dict) -> None:
        await ws.send(json.dumps(payload))

    async def send_system(self, ws: Any, text: str) -> None:
        await self.send_json(ws, MessageFactory.system(text))

    async def broadcast_to_clients(self, clients: list[Any], payload: dict) -> None:
        if not clients:
            return
        encoded = json.dumps(payload)
        await asyncio.gather(
            *(client.send(encoded) for client in clients),
            return_exceptions=True,
        )

    async def send_rooms(self, ws: Any, room_manager: ChatRoomHost) -> None:
        await self.send_json(ws, MessageFactory.rooms(room_manager.get_room_list()))

    async def send_presence(self, ws: Any, session_manager: SessionManager) -> None:
        await self.send_json(ws, MessageFactory.presence(session_manager.get_online_names()))

    async def broadcast_rooms_to_all(
        self,
        session_manager: SessionManager,
        room_manager: ChatRoomHost,
    ) -> None:
        await self.broadcast_to_clients(
            session_manager.get_all_connections(),
            MessageFactory.rooms(room_manager.get_room_list()),
        )

    async def broadcast_presence_to_all(self, session_manager: SessionManager) -> None:
        await self.broadcast_to_clients(
            session_manager.get_all_connections(),
            MessageFactory.presence(session_manager.get_online_names()),
        )

    async def broadcast_room(
        self,
        room_name: str,
        room_manager: ChatRoomHost,
        payload: dict,
    ) -> None:
        await self.broadcast_to_clients(room_manager.get_room_clients(room_name), payload)

    async def push_friends_updates_for(
        self,
        changed_name: str,
        session_manager: SessionManager,
        friend_manager: "FriendManager",
    ) -> None:
        """Push a fresh friends_list to every user who has changed_name as a friend."""
        for name in friend_manager.get_friends(changed_name):
            ws = session_manager.find_by_name(name)
            if not ws:
                continue
            await self._send_friends_list(ws, name, session_manager, friend_manager)

    async def push_friends_list_to(
        self,
        ws: Any,
        name: str,
        session_manager: SessionManager,
        friend_manager: "FriendManager",
    ) -> None:
        await self._send_friends_list(ws, name, session_manager, friend_manager)

    async def _send_friends_list(
        self,
        ws: Any,
        name: str,
        session_manager: SessionManager,
        friend_manager: "FriendManager",
    ) -> None:
        friends = []
        for fname in friend_manager.get_friends(name):
            fws  = session_manager.find_by_name(fname)
            room = session_manager.get_room(fws) if fws else None
            if not fws:
                status = "offline"
            elif room:
                status = "in_room"
            else:
                status = "in_lobby"
            friends.append({"name": fname, "status": status, "room": room})
        await self.send_json(ws, MessageFactory.friends_list(
            friends,
            friend_manager.get_incoming_requests(name),
        ))