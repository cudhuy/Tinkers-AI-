import asyncio
import json
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
        if self.websocket is None:
            await self.connect()
        try:
            # Format the message as a JSON object with content field
            # We don't specify a type so the server will broadcast it to all clients
            json_message = json.dumps({
                "content": message
            })
            await self.websocket.send(json_message)
            return f"Message sent: {message}"
        except Exception as e:
            print(f"Error sending message: {e}")
            return f"Error sending message: {e}"

    async def close(self):
        if self.websocket:
            try:
                await self.websocket.close()
                print("WebSocket connection closed")
            except Exception as e:
                print(f"Error closing WebSocket: {e}")
