import asyncio

import websockets

from chat_server_controller import ChatServerController

# Course: csc3380
# Final Project
# Instructor: Dr. Duncan
# Date: 2026-04-30

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
