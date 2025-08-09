import asyncio
import os

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

conversation_router = APIRouter(prefix="/conversation", tags=["conversation"])


@conversation_router.websocket("/transcribe")
async def transcribe_audio(websocket: WebSocket):
    await websocket.accept()

    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        await websocket.send_json({"error": "OpenAI API key not found"})
        await websocket.close()
        return

    # OpenAI WebSocket URL for real-time transcription
    openai_url = "wss://api.openai.com/v1/realtime?intent=transcription"
    headers = {
        "Authorization": f"Bearer {openai_api_key}",
        "OpenAI-Beta": "realtime=v1",
    }

    try:
        # Connect to OpenAI WebSocket
        async with websockets.connect(openai_url, extra_headers=headers) as openai_ws:
            # Task to receive messages from OpenAI and forward to client
            async def receive_from_openai():
                try:
                    while True:
                        message = await openai_ws.recv()
                        # Forward OpenAI's response to the client
                        await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    await websocket.send_json({"status": "OpenAI connection closed"})

            # Start receiving task
            openai_task = asyncio.create_task(receive_from_openai())

            # Listen for audio data from client and forward to OpenAI
            try:
                while True:
                    # Receive binary audio data from client
                    data = await websocket.receive_bytes()
                    # Forward to OpenAI
                    await openai_ws.send(data)
            except WebSocketDisconnect:
                # Client disconnected
                openai_task.cancel()
                try:
                    await openai_ws.close()
                except:
                    pass
    except websockets.exceptions.InvalidStatusCode as e:
        await websocket.send_json({"error": f"OpenAI connection failed: {str(e)}"})
    except Exception as e:
        await websocket.send_json({"error": f"Error: {str(e)}"})
    finally:
        await websocket.close()
