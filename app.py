import asyncio

import websockets

from chat_server_controller import ChatServerController


async def main() -> None:
    server = ChatServerController()

    async with websockets.serve(
        server.handle_connection,
        "localhost",
        6790,
        max_size=10 * 1024 * 1024,
    ):
        print("WebSocket server running at ws://localhost:6790")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
