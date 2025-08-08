import asyncio
import json
import random

import websockets
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()
from agents import Agent, GuardrailFunctionOutput, InputGuardrail, Runner


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


triage_agent = Agent(
    name="Triage Agent",
    instructions="You determine which agent to use based on the user's homework question",
    handoffs=[history_tutor_agent, math_tutor_agent],
    input_guardrails=[
        InputGuardrail(guardrail_function=homework_guardrail),
    ],
)


# Sample random messages to send to the client
RANDOM_MESSAGES = [
    "Math tutor is ready to help with your calculus homework!",
    "History tutor can explain the American Revolution in detail.",
    "Need help with algebra? Just ask the math tutor!",
    "Our history tutor specializes in ancient civilizations.",
    "Triage agent is analyzing your question...",
    "Working on your query now...",
    "Homework guardrail activated for your question.",
    "Preparing a detailed explanation for your question.",
]


async def send_random_messages(websocket):
    """Send random messages every 3 seconds to the connected client."""
    while True:
        message = {
            "type": "update",
            "content": random.choice(RANDOM_MESSAGES),
            "timestamp": asyncio.get_event_loop().time(),
        }
        await websocket.send(json.dumps(message))
        await asyncio.sleep(3)


async def websocket_handler(websocket):
    """Handle WebSocket connections."""
    print(f"Client connected from {websocket.remote_address}")

    # Start sending random messages
    task = asyncio.create_task(send_random_messages(websocket))

    try:
        async for message in websocket:
            # Handle any messages from client if needed
            data = json.loads(message)
            print(f"Received message: {data}")

            if data["type"] == "query":
                # Process query through agents
                result = await Runner.run(triage_agent, data["content"])
                response = {
                    "type": "response",
                    "content": result.final_output,
                    "timestamp": asyncio.get_event_loop().time(),
                }
                await websocket.send(json.dumps(response))
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        task.cancel()


async def start_websocket_server():
    """Start WebSocket server."""
    server = await websockets.serve(websocket_handler, "localhost", 8765)
    print("WebSocket server started on ws://localhost:8765")
    await server.wait_closed()


async def main():
    # # Original code for testing agents
    # result = await Runner.run(
    #     triage_agent, "who was the first president of the united states?"
    # )
    # print(result.final_output)

    # result = await Runner.run(triage_agent, "what is life")
    # print(result.final_output)

    # Start WebSocket server
    await start_websocket_server()


if __name__ == "__main__":
    asyncio.run(main())
