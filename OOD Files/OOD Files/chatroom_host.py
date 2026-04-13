from typing import Any


class ChatRoomHost:
    """Creates chatrooms and stores room membership."""

    def __init__(self, default_rooms: list[str] | None = None) -> None:
        room_names = default_rooms or ["General", "Math101", "Science", "Gaming"]
        self.rooms: dict[str, set[Any]] = {room_name: set() for room_name in room_names}

    def room_exists(self, room_name: str) -> bool:
        return room_name in self.rooms

    def create_room(self, room_name: str) -> None:
        if not self.room_exists(room_name):
            self.rooms[room_name] = set()

    def add_client_to_room(self, room_name: str, ws: Any) -> None:
        self.create_room(room_name)
        self.rooms[room_name].add(ws)

    def remove_client_from_room(self, room_name: str, ws: Any) -> None:
        if room_name in self.rooms:
            self.rooms[room_name].discard(ws)

    def get_room_clients(self, room_name: str) -> list[Any]:
        return list(self.rooms.get(room_name, set()))

    def get_room_list(self) -> list[dict[str, int | str]]:
        return [
            {"name": room_name, "count": len(clients)}
            for room_name, clients in sorted(
                self.rooms.items(),
                key=lambda item: item[0].lower(),
            )
        ]
