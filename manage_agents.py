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


triage_agent = Agent(
    name="Triage Agent",
    instructions="You determine which agent to use based on the user's homework question. Use the WebSocket tool to send messages when instructed.",
    handoffs=[history_tutor_agent, math_tutor_agent],
    tools=[send_via_websocket],
    # input_guardrails=[
    #     InputGuardrail(guardrail_function=homework_guardrail),
    # ],
)


# Define the function tool for sending messages via WebSocket
@function_tool
async def send_via_websocket(ctx: RunContextWrapper, message: str) -> str:
    """Send a message through the WebSocket connection."""
    websocket_manager = ctx.context["websocket_manager"]
    return await websocket_manager.send(message)


async def main():

    websocket_uri = "ws://localhost:8765"  # Replace with your WebSocket server URI
    websocket_manager = WebSocketManager(websocket_uri)
    await websocket_manager.connect()

    # Define the context with the WebSocketManager instance
    context = {"websocket_manager": websocket_manager}

    # Run the agent with the context
    inputs = [
        "who was the first president of the united states?",
        "what is the capital of this country?",
        "Please send the answers via WebSocket.",
    ]
    runner = Runner(triage_agent)
    history = []
    for input in inputs:
        history.append({"content": input, "role": "user"})
        result = await runner.run(history, context=context)
        print(result.final_output)
        # print(result.to_input_list())
        history = result.to_input_list()

    # Clean up: Close the WebSocket connection
    await websocket_manager.close()

    print(history)


if __name__ == "__main__":
    asyncio.run(main())
