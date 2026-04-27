import asyncio
import json
import websockets

# Predefined rooms
rooms: dict[str, set] = {
    "General": set(),
    "Math101": set(),
    "Science": set(),
    "Gaming": set(),
}

# websocket -> {"name": str, "room": str|None}
sessions: dict[object, dict] = {}

def rooms_payload():
    room_list = [
        {"name": room, "count": len(clients)}
        for room, clients in sorted(rooms.items(), key=lambda x: x[0].lower())
    ]
    return json.dumps({"type": "rooms", "rooms": room_list})

def presence_payload():
    # Unique list of names currently connected
    names = sorted({info.get("name", "Anonymous") for info in sessions.values()})
    return json.dumps({"type": "presence", "online": names})

async def send_rooms_to(ws):
    await ws.send(rooms_payload())

async def send_presence_to(ws):
    await ws.send(presence_payload())

async def broadcast_rooms_to_all():
    payload = rooms_payload()
    await asyncio.gather(*(w.send(payload) for w in list(sessions.keys())), return_exceptions=True)

async def broadcast_presence_to_all():
    payload = presence_payload()
    await asyncio.gather(*(w.send(payload) for w in list(sessions.keys())), return_exceptions=True)

async def broadcast(room: str, payload: str):
    clients = rooms.get(room, set())
    if not clients:
        return
    await asyncio.gather(*(w.send(payload) for w in list(clients)), return_exceptions=True)

def name_taken(requested_name: str, ws) -> bool:
    """Return True if someone else is already using this name."""
    for other_ws, info in sessions.items():
        if other_ws is ws:
            continue
        if info.get("name") == requested_name:
            return True
    return False

async def leave_current_room(ws):
    info = sessions.get(ws, {})
    room = info.get("room")
    name = info.get("name", "Anonymous")

    if room and room in rooms:
        rooms[room].discard(ws)
        await broadcast(room, json.dumps({"type": "system", "text": f"{name} left {room}"}))

    info["room"] = None
    sessions[ws] = info

async def handle(ws):
    sessions[ws] = {"name": "Anonymous", "room": None}

    # Send initial room list + presence list
    await send_rooms_to(ws)
    await send_presence_to(ws)
    await broadcast_presence_to_all()

    try:
        async for raw in ws:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "system", "text": "Invalid JSON format."}))
                continue

            t = data.get("type")

            if t == "list":
                await send_rooms_to(ws)

            elif t == "who":
                await send_presence_to(ws)

            elif t == "join":
                name = (data.get("name") or "Anonymous").strip() or "Anonymous"
                room = (data.get("room") or "").strip()

                if not room:
                    await ws.send(json.dumps({"type": "system", "text": "Room name cannot be empty."}))
                    continue
                if room not in rooms:
                    await ws.send(json.dumps({"type": "system", "text": f"Room '{room}' does not exist."}))
                    continue

                # Optional but recommended: enforce unique names
                if name != sessions[ws].get("name") and name_taken(name, ws):
                    await ws.send(json.dumps({
                        "type": "system",
                        "text": f"Name '{name}' is already online. Pick a different name."
                    }))
                    continue

                sessions[ws]["name"] = name

                await leave_current_room(ws)

                rooms[room].add(ws)
                sessions[ws]["room"] = room

                await ws.send(json.dumps({"type": "system", "text": f"Joined room: {room}"}))
                await broadcast(room, json.dumps({"type": "system", "text": f"{name} joined {room}"}))

                await broadcast_rooms_to_all()
                await broadcast_presence_to_all()

            elif t == "chat":
                info = sessions.get(ws, {})
                room = info.get("room")
                name = info.get("name", "Anonymous")
                text = (data.get("text") or "").strip()

                if not room:
                    await ws.send(json.dumps({"type": "system", "text": "Join a room first."}))
                    continue
                if not text:
                    continue

                await broadcast(room, json.dumps({"type": "chat", "room": room, "name": name, "text": text}))

            elif t == "image":
                info = sessions.get(ws, {})
                room = info.get("room")
                name = info.get("name", "Anonymous")
                data_url = data.get("dataUrl")
                mime = data.get("mime", "")

                if not room:
                    await ws.send(json.dumps({"type": "system", "text": "Join a room first."}))
                    continue
                if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
                    await ws.send(json.dumps({"type": "system", "text": "Invalid image payload."}))
                    continue

                await broadcast(room, json.dumps({
                    "type": "image",
                    "room": room,
                    "name": name,
                    "mime": mime,
                    "dataUrl": data_url
                }))

            else:
                await ws.send(json.dumps({"type": "system", "text": f"Unknown message type: {t}"}))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await leave_current_room(ws)
        sessions.pop(ws, None)
        await broadcast_rooms_to_all()
        await broadcast_presence_to_all()

async def main():
    async with websockets.serve(handle, "localhost", 6790, max_size=10 * 1024 * 1024):
        print("WebSocket server running at ws://localhost:6790")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())