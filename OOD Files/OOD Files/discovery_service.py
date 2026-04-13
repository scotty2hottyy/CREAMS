import asyncio
import json
import socket
import uuid
from contextlib import suppress
from time import monotonic
from typing import Any

from chatroom_host import ChatRoomHost


class DiscoveryService:
    """Advertises local rooms on the LAN and discovers remote rooms."""

    UDP_PORT = 6791
    DISCOVERY_WAIT_SECONDS = 0.4
    ANNOUNCE_INTERVAL_SECONDS = 5
    ROOM_TTL_SECONDS = 15

    def __init__(self, room_manager: ChatRoomHost, ws_port: int) -> None:
        self.room_manager = room_manager
        self.ws_port = ws_port
        self.node_id = str(uuid.uuid4())
        self.host_name = socket.gethostname()
        self._socket: socket.socket | None = None
        self._listen_task: asyncio.Task[None] | None = None
        self._announce_task: asyncio.Task[None] | None = None
        self._discovered_rooms: dict[tuple[str, str], dict[str, Any]] = {}

    async def start(self) -> None:
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self._socket.bind(("", self.UDP_PORT))
        self._socket.setblocking(False)

        self._listen_task = asyncio.create_task(self._listen_loop())
        self._announce_task = asyncio.create_task(self._announce_loop())

    async def stop(self) -> None:
        tasks = [task for task in (self._listen_task, self._announce_task) if task is not None]
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task

        if self._socket is not None:
            self._socket.close()
            self._socket = None

    async def discover_now(self) -> None:
        await self._broadcast_payload({"kind": "discover", "node_id": self.node_id})
        await asyncio.sleep(self.DISCOVERY_WAIT_SECONDS)
        self._prune_stale_rooms()

    def get_combined_rooms(self) -> list[dict[str, Any]]:
        local_rooms = [
            {
                "name": room["name"],
                "count": room["count"],
                "host": self.host_name,
                "host_ip": self._get_local_ip(),
                "ws_url": self._build_ws_url(self._get_local_ip()),
                "source": "local",
            }
            for room in self.room_manager.get_room_list()
        ]
        self._prune_stale_rooms()
        remote_rooms = sorted(
            self._discovered_rooms.values(),
            key=lambda room: (room["name"].lower(), room["host"].lower()),
        )
        return local_rooms + remote_rooms

    async def _listen_loop(self) -> None:
        if self._socket is None:
            return

        loop = asyncio.get_running_loop()
        while True:
            data, addr = await loop.sock_recvfrom(self._socket, 65_535)
            try:
                payload = json.loads(data.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                continue

            if payload.get("node_id") == self.node_id:
                continue

            kind = payload.get("kind")
            if kind == "discover":
                await self._send_room_payload("discover_response", addr[0], addr[1])
                continue

            if kind in {"announce", "discover_response"}:
                self._store_remote_rooms(payload, addr[0])

    async def _announce_loop(self) -> None:
        while True:
            with suppress(OSError):
                await self._send_room_payload("announce")
            await asyncio.sleep(self.ANNOUNCE_INTERVAL_SECONDS)

    async def _send_room_payload(
        self,
        kind: str,
        target_ip: str = "255.255.255.255",
        target_port: int | None = None,
    ) -> None:
        payload = {
            "kind": kind,
            "node_id": self.node_id,
            "host": self.host_name,
            "host_ip": self._get_local_ip(),
            "ws_port": self.ws_port,
            "rooms": self.room_manager.get_room_list(),
        }
        await self._broadcast_payload(payload, target_ip, target_port or self.UDP_PORT)

    async def _broadcast_payload(
        self,
        payload: dict[str, Any],
        target_ip: str = "255.255.255.255",
        target_port: int = UDP_PORT,
    ) -> None:
        if self._socket is None:
            return

        loop = asyncio.get_running_loop()
        encoded = json.dumps(payload).encode("utf-8")
        with suppress(OSError):
            await loop.sock_sendto(self._socket, encoded, (target_ip, target_port))

    def _store_remote_rooms(self, payload: dict[str, Any], source_ip: str) -> None:
        host_ip = str(payload.get("host_ip") or source_ip)
        host_name = str(payload.get("host") or host_ip)
        ws_port = int(payload.get("ws_port") or self.ws_port)
        now = monotonic()

        for room in payload.get("rooms", []):
            room_name = str(room.get("name") or "").strip()
            if not room_name:
                continue
            room_key = (host_ip, room_name)
            self._discovered_rooms[room_key] = {
                "name": room_name,
                "count": int(room.get("count") or 0),
                "host": host_name,
                "host_ip": host_ip,
                "ws_url": self._build_ws_url(host_ip, ws_port),
                "source": "remote",
                "last_seen": now,
            }

    def _prune_stale_rooms(self) -> None:
        cutoff = monotonic() - self.ROOM_TTL_SECONDS
        stale_keys = [
            room_key
            for room_key, room in self._discovered_rooms.items()
            if float(room.get("last_seen", 0)) < cutoff
        ]
        for room_key in stale_keys:
            self._discovered_rooms.pop(room_key, None)

    def _build_ws_url(self, host_ip: str, port: int | None = None) -> str:
        return f"ws://{host_ip}:{port or self.ws_port}"

    def _get_local_ip(self) -> str:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                probe.connect(("8.8.8.8", 80))
                return str(probe.getsockname()[0])
        except OSError:
            return "127.0.0.1"
