import asyncio
import websockets


# WebSocketManager class to handle persistent WebSocket connection
class WebSocketManager:
    def __init__(self, uri):
        self.uri = uri
        self.websocket = None

    async def connect(self):
        self.websocket = await websockets.connect(self.uri)
        print(f"Connected to WebSocket at {self.uri}")

    async def send(self, message):
        if self.websocket is None or self.websocket.closed:
            await self.connect()
        await self.websocket.send(message)
        return f"Message sent: {message}"

    async def close(self):
        if self.websocket and not self.websocket.closed:
            await self.websocket.close()
            print("WebSocket connection closed")
