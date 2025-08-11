#!/usr/bin/env python3
import asyncio
import json
import logging
import sys
import time
import wave

import pyaudio
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("transcribe_test")

# Print websockets version for debugging
logger.info(f"Using websockets version: {websockets.__version__}")

# WebSocket endpoint URL - adjusted to include /api prefix
WS_URL = "ws://localhost:8000/api/conversation/transcribe"

# Audio recording parameters
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 24000  # 16kHz is common for speech recognition
CHUNK = 1024  # Audio buffer size
RECORD_SECONDS = (
    30  # How long to record for testing - increased to 5 seconds for better results
)


async def record_and_send():
    """
    Record audio from microphone and send it to the transcription WebSocket endpoint.
    """
    try:
        # Initialize PyAudio
        p = pyaudio.PyAudio()

        # Open microphone stream
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )

        logger.info("Connecting to WebSocket at %s", WS_URL)
        try:
            # Connect to WebSocket with websockets 15.x API
            async with websockets.connect(WS_URL) as websocket:
                logger.info("Connected to WebSocket")
                logger.info("Recording for %s seconds... SPEAK NOW", RECORD_SECONDS)

                # Start time for recording duration tracking
                start_time = time.time()
                end_time = start_time + RECORD_SECONDS

                # Track if we received any transcription text
                received_transcription = False

                # Task to receive and print transcription results
                async def receive_transcription():
                    nonlocal received_transcription
                    while True:
                        try:
                            response = await websocket.recv()
                            # Try to parse as JSON - OpenAI sends JSON messages
                            try:
                                result = json.loads(response)
                                if "text" in result:
                                    received_transcription = True
                                    logger.info("Transcription: %s", result["text"])
                                elif "error" in result:
                                    logger.error(
                                        "Error from server: %s", result["error"]
                                    )
                                elif "status" in result:
                                    logger.info("Status: %s", result["status"])
                                else:
                                    # For other response types, just log key fields
                                    if "type" in result:
                                        type_str = result.get("type", "")
                                        if (
                                            "session" in result
                                            and "id" in result["session"]
                                        ):
                                            logger.info(
                                                "Response: %s (Session ID: %s)",
                                                type_str,
                                                result["session"]["id"],
                                            )
                                        else:
                                            logger.info("Response: %s", type_str)
                                    else:
                                        logger.info("Response: %s", result)
                            except json.JSONDecodeError:
                                logger.info("Raw response: %s", response)
                        except websockets.ConnectionClosed as e:
                            if not received_transcription:
                                logger.warning(
                                    "Connection closed without receiving any transcription"
                                )
                            logger.info("WebSocket connection closed: %s", str(e))
                            break

                # Start receiving task BEFORE sending audio
                receive_task = asyncio.create_task(receive_transcription())

                # Record and send audio data
                try:
                    logger.info("SPEAK CLEARLY into your microphone...")
                    while time.time() < end_time:
                        # Read audio data from microphone
                        data = stream.read(CHUNK, exception_on_overflow=False)

                        # Send binary audio data to WebSocket
                        await websocket.send(data)

                        # Give the event loop a chance to process received messages
                        await asyncio.sleep(0.01)  # Small sleep to yield control

                    logger.info("Recording finished")

                    # Keep connection open for a bit to receive final results
                    await asyncio.sleep(
                        3
                    )  # Increased to give more time for final results

                except Exception as e:
                    logger.exception("Error during recording: %s", str(e))
                finally:
                    # Clean up
                    receive_task.cancel()
                    try:
                        await receive_task
                    except asyncio.CancelledError:
                        pass

        except Exception as e:
            # For websockets 15.x, error handling is different
            if "403" in str(e):
                logger.error(
                    "HTTP 403 Forbidden - Check if the API endpoint is correct and accessible"
                )
            elif "404" in str(e):
                logger.error(
                    "HTTP 404 Not Found - The WebSocket endpoint path might be incorrect"
                )
            else:
                logger.exception("WebSocket connection error: %s", str(e))

        # Stop and close the stream
        stream.stop_stream()
        stream.close()
        p.terminate()
        logger.info("Audio stream closed")

    except Exception as e:
        logger.exception("Unexpected error: %s", str(e))


if __name__ == "__main__":
    logger.info("Starting audio transcription test...")
    try:
        asyncio.run(record_and_send())
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.exception("Fatal error: %s", str(e))
