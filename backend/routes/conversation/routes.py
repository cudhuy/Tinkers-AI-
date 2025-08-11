import asyncio
import base64
import json
import os
import traceback

import websockets
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

load_dotenv()

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

    try:
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        print(f"Connecting to OpenAI at {openai_url}")
        # Connect to OpenAI
        async with websockets.connect(
            openai_url, additional_headers=headers
        ) as openai_ws:
            print("Connected to OpenAI WebSocket")
            await handle_connection(websocket, openai_ws)

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        # Only log full traceback for non-connection-closed errors
        if not isinstance(e, websockets.ConnectionClosedOK):
            error_msg += f"\n{traceback.format_exc()}"
        print(error_msg)  # Print to server logs

        # Check if the websocket is still open before trying to send/close
        if not websocket.client_state.DISCONNECTED:
            await websocket.send_json({"error": error_msg})
            await websocket.close()


async def handle_connection(websocket, openai_ws):
    """Handle the connection between client and OpenAI."""

    # Send session configuration to OpenAI
    session_config = {
        "type": "transcription_session.update",
        "session": {
            "input_audio_transcription": {
                "model": "gpt-4o-mini-transcribe",  # Use the newer transcription model
                "language": "pl",
            },
            "turn_detection": {
                "type": "semantic_vad",
                # "type": "server_vad",
                # "silence_duration_ms": 200,
                # "prefix_padding_ms": 300,
                # "threshold": 0.5,
                "eagerness": "high",
            },
        },
    }

    try:
        await openai_ws.send(json.dumps(session_config))
        print("Sent session configuration to OpenAI")
    except Exception as e:
        print(f"Error sending session configuration: {e}")
        await websocket.send_json({"error": f"Failed to configure session: {str(e)}"})
        return

    # Task to receive messages from OpenAI and forward to client
    async def receive_from_openai():
        try:
            current_transcript = ""
            while True:
                message = await openai_ws.recv()

                # Process message based on its type
                try:
                    data = json.loads(message)
                    event_type = data.get("type", "")

                    # Handle different event types
                    if event_type == "transcription_session.created":
                        print(f"Transcription session created: {data}")
                        await websocket.send_json(
                            {
                                "status": "Session created",
                                "session_id": data.get("session", {}).get("id"),
                            }
                        )

                    elif event_type == "transcription_session.updated":
                        print(f"Transcription session updated: {data}")
                        await websocket.send_json(
                            {"status": "Session configuration updated"}
                        )

                    # elif (
                    #     event_type
                    #     == "conversation.item.input_audio_transcription.delta"
                    # ):
                    #     delta = data.get("delta", "")
                    #     if delta:
                    #         current_transcript += delta
                    #         await websocket.send_json(
                    #             {"text": current_transcript, "is_final": False}
                    #         )

                    elif (
                        event_type
                        == "conversation.item.input_audio_transcription.completed"
                    ):
                        # Final transcription
                        print(f"Final transcription: {data}")
                        final_transcript = data.get("transcript", "")
                        if final_transcript:
                            current_transcript = (
                                final_transcript  # Reset with the complete transcript
                            )
                            await websocket.send_json(
                                {"text": final_transcript, "is_final": True}
                            )

                    elif event_type == "input_audio_buffer.speech_stopped":
                        print("Speech stopped detected")
                        await websocket.send_json({"status": "Speech stopped detected"})

                    elif event_type == "error":
                        error_info = data.get("error", {})
                        error_msg = f"Error from OpenAI: {error_info.get('message', 'Unknown error')}"
                        print(error_msg)
                        await websocket.send_json({"error": error_msg})

                    else:
                        # Forward other messages directly
                        await websocket.send_text(message)

                except json.JSONDecodeError:
                    # If not valid JSON, just forward the raw message
                    await websocket.send_text(message)

        except websockets.ConnectionClosed as e:
            if e.code == 1000:  # Normal closure
                await websocket.send_json(
                    {"status": "OpenAI session completed normally"}
                )
            else:
                await websocket.send_json(
                    {"status": f"OpenAI connection closed: {str(e)}"}
                )

    # Start receiving task
    openai_task = asyncio.create_task(receive_from_openai())

    # Listen for audio data from client and forward to OpenAI
    try:
        while True:
            # Receive binary audio data from client
            data = await websocket.receive_bytes()
            try:
                # For the transcription API, audio data must be sent as base64 in a JSON message
                # Convert binary audio data to base64
                base64_audio = base64.b64encode(data).decode("utf-8")

                # Format audio data for OpenAI transcription API
                audio_message = {
                    "type": "input_audio_buffer.append",
                    "audio": base64_audio,
                }

                # Send JSON audio message to OpenAI
                await openai_ws.send(json.dumps(audio_message))

                # Add a small yield to the event loop to allow other tasks to run
                # This can help ensure the receive_from_openai task gets CPU time
                await asyncio.sleep(0)

            except websockets.ConnectionClosedOK:
                # Connection closed normally, no need to report as error
                print("OpenAI connection closed normally")
                break
            except Exception as e:
                print(f"Error sending data to OpenAI: {e}")
                await websocket.send_json({"error": f"Error sending data: {str(e)}"})
                break
    except WebSocketDisconnect:
        # Client disconnected
        print("Client disconnected")
    finally:
        # Clean up
        openai_task.cancel()
        try:
            await openai_ws.close()
        except:
            pass
