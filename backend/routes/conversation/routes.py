import asyncio
import base64
import json
import os
import traceback

import websockets
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from routes.conversation.agent import (
    AgendaAgent,
    ConversationTipsAgent,
    EngagementAgent,
    OfftopicAgent,
)

load_dotenv()

conversation_router = APIRouter(prefix="/conversation", tags=["conversation"])


@conversation_router.websocket("/transcribe")
async def transcribe_audio(websocket: WebSocket):
    await websocket.accept()

    agents = [
        AgendaAgent(websocket),
        EngagementAgent(websocket),
        OfftopicAgent(websocket),
        ConversationTipsAgent(websocket),
    ]

    for agent in agents:
        asyncio.create_task(agent.process_transcripts())

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
            await handle_connection(websocket, openai_ws, agents)

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


async def handle_connection(websocket, openai_ws, agents):
    """Handle the connection between client and OpenAI."""

    # Send session configuration to OpenAI
    session_config = {
        "type": "transcription_session.update",
        "session": {
            "input_audio_transcription": {
                "model": "gpt-4o-mini-transcribe",  # Use the newer transcription model
                "language": "en",
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
                        # print(f"Final transcription: {data}")
                        final_transcript = data.get("transcript", "")
                        if final_transcript:
                            for agent in agents:
                                await agent.add_transcript(final_transcript)
                            # await websocket.send_json(
                            #     {"text": final_transcript, "is_final": True}
                            # )

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
            try:
                # Try to receive different types of messages
                message_type = None
                message_data = None

                # First check if there's a text message (for agenda info)
                try:
                    message_data = await asyncio.wait_for(
                        websocket.receive_text(), timeout=0.01
                    )
                    message_type = "text"
                except (asyncio.TimeoutError, KeyError):
                    # No text message available, try binary
                    pass

                # If no text message, try binary
                if message_type is None:
                    try:
                        message_data = await websocket.receive_bytes()
                        message_type = "binary"
                    except Exception as e:
                        # If this fails too, it might be a connection issue
                        print(f"Error receiving message: {e}")
                        await asyncio.sleep(0.01)
                        continue

                # Process the message based on its type
                if message_type == "text":
                    try:
                        json_data = json.loads(message_data)

                        # Handle agenda information
                        if (
                            json_data.get("type") == "agenda_info"
                            and "agenda" in json_data
                        ):
                            print("Received agenda information")
                            for agent in agents:
                                await agent.add_agenda_info(json_data["agenda"])
                            await websocket.send_json(
                                {"status": "Agenda information received"}
                            )
                    except json.JSONDecodeError:
                        print(f"Received non-JSON text: {message_data}")

                elif message_type == "binary":
                    # Process binary audio data
                    # For the transcription API, audio data must be sent as base64 in a JSON message
                    # Convert binary audio data to base64
                    base64_audio = base64.b64encode(message_data).decode("utf-8")

                    # Format audio data for OpenAI transcription API
                    audio_message = {
                        "type": "input_audio_buffer.append",
                        "audio": base64_audio,
                    }

                    # Send JSON audio message to OpenAI
                    await openai_ws.send(json.dumps(audio_message))

                # Add a small yield to the event loop to allow other tasks to run
                await asyncio.sleep(0.01)

            except websockets.ConnectionClosedOK:
                print("OpenAI connection closed normally")
                break
            except WebSocketDisconnect:
                print("Client disconnected")
                break
            except RuntimeError as e:
                # Check for the specific disconnect error
                if (
                    'Cannot call "receive" once a disconnect message has been received.'
                    in str(e)
                ):
                    print("WebSocket already disconnected, stopping receive loop.")
                    break
                else:
                    print(f"RuntimeError: {e}")
                    # Only try to send error if still connected
                    if websocket.client_state.name == "CONNECTED":
                        await websocket.send_json({"error": str(e)})
                    break
            except Exception as e:
                import traceback

                traceback.print_exc()
                print(f"Error processing message: {e}")
                # Only try to send error if still connected
                if websocket.client_state.name == "CONNECTED":
                    await websocket.send_json(
                        {"error": f"Error processing message: {str(e)}"}
                    )
                continue
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
