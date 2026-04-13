import asyncio

import websockets

from chat_server_controller import ChatServerController


async def main() -> None:
    server = ChatServerController()
    await server.start()

    try:
        async with websockets.serve(
            server.handle_connection,
            "0.0.0.0",
            6790,
            max_size=10 * 1024 * 1024,
        ):
            print("WebSocket server running at ws://0.0.0.0:6790")
            print("LAN discovery running on UDP port 6791")
            await asyncio.Future()
    finally:
        await server.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped.")
