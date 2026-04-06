from typing import Any

from models import Session


class SessionManager:
    """Tracks connected users, their names, and the room each user is in."""

    def __init__(self) -> None:
        self.sessions: dict[Any, Session] = {}

    def register(self, ws: Any) -> None:
        self.sessions[ws] = Session()

    def unregister(self, ws: Any) -> None:
        self.sessions.pop(ws, None)

    def get_session(self, ws: Any) -> Session:
        return self.sessions.setdefault(ws, Session())

    def get_all_connections(self) -> list[Any]:
        return list(self.sessions.keys())

    def get_online_names(self) -> list[str]:
        return sorted({session.name for session in self.sessions.values()})

    def is_name_taken(self, requested_name: str, current_ws: Any) -> bool:
        for other_ws, session in self.sessions.items():
            if other_ws is current_ws:
                continue
            if session.name == requested_name:
                return True
        return False

    def set_name(self, ws: Any, name: str) -> None:
        self.get_session(ws).name = name

    def get_name(self, ws: Any) -> str:
        return self.get_session(ws).name

    def set_room(self, ws: Any, room: str | None) -> None:
        self.get_session(ws).room = room

    def get_room(self, ws: Any) -> str | None:
        return self.get_session(ws).room
