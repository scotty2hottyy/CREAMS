from typing import Any


class ChatRoomHost:
    """Creates chatrooms and stores room membership."""

    def __init__(self, default_rooms: list[str] | None = None) -> None:
        room_names = default_rooms or ["General", "Math101", "Science", "Gaming"]
        self.rooms: dict[str, set[Any]] = {room_name: set() for room_name in room_names}
        self.passwords: dict[str, str | None] = {room_name: None for room_name in room_names}

    def room_exists(self, room_name: str) -> bool:
        return room_name in self.rooms

    def create_room(self, room_name: str, password: str | None = None) -> None:
        if not self.room_exists(room_name):
            self.rooms[room_name] = set()
            self.passwords[room_name] = password or None

    def is_password_protected(self, room_name: str) -> bool:
        return bool(self.passwords.get(room_name))

    def check_password(self, room_name: str, password: str | None) -> bool:
        """Returns True if password matches, or room has no password."""
        stored = self.passwords.get(room_name)
        if not stored:
            return True
        return (password or "") == stored

    def add_client_to_room(self, room_name: str, ws: Any) -> None:
        self.create_room(room_name)
        self.rooms[room_name].add(ws)

    def remove_client_from_room(self, room_name: str, ws: Any) -> None:
        if room_name in self.rooms:
            self.rooms[room_name].discard(ws)

    def get_room_clients(self, room_name: str) -> list[Any]:
        return list(self.rooms.get(room_name, set()))

    def get_room_list(self) -> list[dict[str, int | str | bool]]:
        return [
            {
                "name": room_name,
                "count": len(clients),
                "locked": self.is_password_protected(room_name),
            }
            for room_name, clients in sorted(
                self.rooms.items(),
                key=lambda item: item[0].lower(),
            )
        ]