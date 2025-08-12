import asyncio
import json

from agents import (
    Agent,
    GuardrailFunctionOutput,
    RunContextWrapper,
    Runner,
    function_tool,
)
from dotenv import load_dotenv
from pydantic import BaseModel

from websocket_manager import WebSocketManager

load_dotenv()


# Define the function tool for sending messages via WebSocket
@function_tool
async def send_via_websocket(ctx: RunContextWrapper, message: str) -> str:
    """Send a message through the WebSocket connection."""
    websocket_manager = ctx.context["websocket_manager"]
    return await websocket_manager.send(message)


triage_agent = Agent(
    name="Triage Agent",
    instructions="You determine which agent to use based on the user's homework question. Use the WebSocket tool to send messages when instructed.",
    tools=[send_via_websocket],
    # input_guardrails=[
    #     InputGuardrail(guardrail_function=homework_guardrail),
    # ],
)


# Helper function to wait for the WebSocket server to be available
async def wait_for_server(websocket_uri, timeout=5):
    start_time = asyncio.get_event_loop().time()
    while True:
        try:
            websocket_manager = WebSocketManager(websocket_uri)
            await websocket_manager.connect()
            return websocket_manager
        except Exception as e:
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError(f"Could not connect to WebSocket server: {e}")
            await asyncio.sleep(0.1)


async def main():
    websocket_uri = "ws://localhost:8765"
    try:
        websocket_manager = await wait_for_server(websocket_uri)
    except TimeoutError as e:
        print(f"Error: {e}")
        print("Make sure the WebSocket server is running on port 8765")
        return

    context = {"websocket_manager": websocket_manager}
    history = []
    print("Agent connected and running. Waiting for frontend messages...")
    try:
        await websocket_manager.send("Agent ready")
        while True:
            msg = await websocket_manager.websocket.recv()
            try:
                data = json.loads(msg)
                if data.get("from") == "frontend":
                    user_input = data.get("content", "")
                    if user_input:
                        history.append({"content": user_input, "role": "user"})
                        result = await Runner.run(
                            triage_agent, history, context=context
                        )
                        print(result.final_output)
                        history = result.to_input_list()
                # Ignore messages not from frontend
            except Exception as e:
                print(f"Error processing message: {e}")
    except Exception as e:
        print(f"Agent main loop error: {e}")
    finally:
        await websocket_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
