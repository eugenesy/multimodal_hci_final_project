from __future__ import annotations

import asyncio
import json
from typing import Any

import websockets


class TrackerBroadcastServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8765) -> None:
        self.host = host
        self.port = port
        self._clients: set[websockets.WebSocketServerProtocol] = set()
        self._server = None
        self.loop = None

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def start(self) -> None:
        self.loop = asyncio.get_event_loop()
        self._server = await websockets.serve(self._handle_client, self.host, self.port)

    async def stop(self) -> None:
        for client in list(self._clients):
            await client.close()
        self._clients.clear()
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._clients:
            return

        message = json.dumps(payload)
        stale = []
        for client in list(self._clients):
            try:
                await client.send(message)
            except websockets.ConnectionClosed:
                stale.append(client)

        for client in stale:
            self._clients.discard(client)

    async def _handle_client(self, websocket: websockets.WebSocketServerProtocol) -> None:
        self._clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self._clients.discard(websocket)
