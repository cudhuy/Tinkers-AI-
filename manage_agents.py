import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()
from agents import (
    Agent,
    GuardrailFunctionOutput,
    Runner,
    function_tool,
    RunContextWrapper,
)
from websocket_manager import WebSocketManager


class HomeworkOutput(BaseModel):
    is_homework: bool
    reasoning: str


guardrail_agent = Agent(
    name="Guardrail check",
    instructions="Check if the user is asking about homework.",
    output_type=HomeworkOutput,
)

math_tutor_agent = Agent(
    name="Math Tutor",
    handoff_description="Specialist agent for math questions",
    instructions="You provide help with math problems. Explain your reasoning at each step and include examples",
)

history_tutor_agent = Agent(
    name="History Tutor",
    handoff_description="Specialist agent for historical questions",
    instructions="You provide assistance with historical queries. Explain important events and context clearly.",
)


async def homework_guardrail(ctx, agent, input_data):
    result = await Runner.run(guardrail_agent, input_data, context=ctx.context)
    final_output = result.final_output_as(HomeworkOutput)
    return GuardrailFunctionOutput(
        output_info=final_output,
        tripwire_triggered=not final_output.is_homework,
    )


# Define the function tool for sending messages via WebSocket
@function_tool
async def send_via_websocket(ctx: RunContextWrapper, message: str) -> str:
    """Send a message through the WebSocket connection."""
    websocket_manager = ctx.context["websocket_manager"]
    return await websocket_manager.send(message)


triage_agent = Agent(
    name="Triage Agent",
    instructions="You determine which agent to use based on the user's homework question. Use the WebSocket tool to send messages when instructed.",
    handoffs=[history_tutor_agent, math_tutor_agent],
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
    from websocket_server import start_websocket_server

    # Variable to track the server task if we start it
    server_task = None
    websocket_uri = "ws://localhost:8765"

    # Try to start the WebSocket server
    try:
        server_task = asyncio.create_task(start_websocket_server())
        await asyncio.sleep(0.1)  # Brief pause to check if it starts or fails
        if server_task.done():
            # Check if the task failed with an "address already in use" error
            try:
                server_task.result()  # This will raise the exception if there was one
            except OSError as e:
                if "address already in use" in str(e):
                    print("WebSocket server already running on port 8765")
                    server_task = None  # No need to manage a task we didn't start
                else:
                    raise  # Re-raise other exceptions
        else:
            print("Started WebSocket server")
    except Exception as e:
        if "address already in use" in str(e):
            print("WebSocket server already running on port 8765")
            server_task = None  # No need to manage a task we didn't start
        else:
            raise  # Re-raise other exceptions (e.g., invalid host)

    # Connect to the WebSocket server, retrying until success or timeout
    try:
        websocket_manager = await wait_for_server(websocket_uri)
    except TimeoutError as e:
        print(f"Error: {e}")
        print("Make sure the WebSocket server is running on port 8765")
        return  # Exit the function if we can't connect

    # Set up the context with the WebSocketManager
    context = {"websocket_manager": websocket_manager}

    # Test inputs for the triage agent
    inputs = [
        "who was the first president of the united states?",
        "what is the capital of this country?",
        "Please send the answers to both questions via WebSocket.",
    ]
    history = []
    for input in inputs:
        history.append({"content": input, "role": "user"})
        result = await Runner.run(triage_agent, history, context=context)
        print(result.final_output)
        history = result.to_input_list()

    # Clean up: Close the WebSocket connection
    await websocket_manager.close()

    # If we started the server, cancel it gracefully
    if server_task:
        server_task.cancel()
        try:
            await server_task
        except asyncio.CancelledError:
            pass

    print(history)


if __name__ == "__main__":
    asyncio.run(main())
