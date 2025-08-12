import asyncio
import json
from typing import Any, Dict, Optional

from agents import (
    Agent,
    RunContextWrapper,
    Runner,
    function_tool,
)
from fastapi import WebSocket

from routes.conversation.prompts import CHECKLIST_PROMPT
from pydantic import BaseModel

class IsWrong(BaseModel):
    is_wrong: bool
    reasoning: str



@function_tool
async def send_via_websocket(ctx: RunContextWrapper, checkpoint_fulfilled: int) -> str:
    websocket = ctx.context["websocket"]
    return await websocket.send_json({"checkpoint_fulfilled": checkpoint_fulfilled})


class TranscriptionAgent:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.chat_history: list[dict[str, Any]] = []
        self.transcript_queue = asyncio.Queue()
        self.agenda_info: Optional[Dict[str, Any]] = None

    async def add_transcript(self, transcript: str):
        """Add a transcript to the queue for processing"""
        await self.transcript_queue.put({"text": transcript})

        # Update current transcript
        self.chat_history.append({"role": "user", "content": transcript})
        print(f"Added to chat history: {transcript}")

    async def add_agenda_info(self, agenda_data: Dict[str, Any]):
        """Add agenda information received from the frontend"""
        self.agenda_info = agenda_data
        print(f"Received agenda information: {agenda_data}")

        # Update the chat history with agenda information
        if self.agenda_info:
            agenda_content = f"Agenda for meeting: {self.agenda_info.get('title')}\n"

            if (
                "checklist_items" in self.agenda_info
                and self.agenda_info["checklist_items"]
            ):
                agenda_content += "Checklist items:\n"
                for i, tip in enumerate(self.agenda_info["checklist_items"], 1):
                    agenda_content += f"{i}. {tip}\n"

            self.chat_history.append({"role": "system", "content": agenda_content})
            print(f"Added agenda to chat history: {agenda_content}")

    async def process_transcripts(self):
        """Process transcripts as they come in"""
        while True:
            try:
                # Get the next transcript from the queue
                transcript_data = await self.transcript_queue.get()

                # Example: You could send this to another AI service for further processing
                await self.process_final_transcript(transcript_data["text"])

                # Mark the task as done
                self.transcript_queue.task_done()

                await asyncio.sleep(0.01)

            except Exception as e:
                print(f"Error in transcript processing: {e}")
                # Don't break the loop on error, continue processing
                continue

    async def process_final_transcript(self, transcript: str):
        """Process a final transcript - can be extended with custom logic"""
        # This is where you could add additional processing for final transcripts
        # For example, sending to a chatbot service, analyzing sentiment, etc.
        pass


class AgendaAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.agenda_agent = Agent(
            name="Agenda Agent",
            instructions=(CHECKLIST_PROMPT),
            tools=[send_via_websocket],
        )
        # Initial chat history will be updated when we receive the agenda info
        self.chat_history = []

    async def process_final_transcript(self, transcript: str):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.agenda_agent,
            self.chat_history,
            context={"websocket": self.websocket},
        )
        print("Agent output:", result.final_output)

        self.chat_history = result.to_input_list()


@function_tool
async def send_via_websocket_words_count(ctx: RunContextWrapper, user_type: str) -> str:
    """Sends the classification result to the WebSocket server. It gets as user_type
    'host' or 'guest' as string"""
    websocket = ctx.context["websocket"]
    n_words = ctx.context["n_words"]
    return await websocket.send_json({"words_count": n_words, "user_type": user_type})


class EngagementAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.engagement_agent = Agent(
            name="Engagement Agent",
            model="gpt-4.1",
            instructions=(
                "You will be given transcriptions of running meeting, "
                "it will be passed to you in chunks. "
                "For each chunk, you need to "
                "classify if the text was said by host of the meeting or the guest. "
                "Then send the classification result to the WebSocket server. "
            ),
            tools=[send_via_websocket_words_count],
        )
        self.chat_history = []

    async def process_final_transcript(self, transcript: str):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.engagement_agent,
            self.chat_history,
            context={"websocket": self.websocket, "n_words": len(transcript.split())},
        )
        print("Agent output:", result.final_output)

        self.chat_history = result.to_input_list()



@function_tool
async def send_checkpoint_via_websocket(ctx: RunContextWrapper, new_checkpoint_content: str) -> str:
    guard_agent = Agent(
        name="Guardrail check",
        instructions="Check if the new checkpoint content is aggressive, harmful, dangerous or unrelated.",
        output_type=IsWrong,
    )

    result = await Runner.run(guard_agent, new_checkpoint_content, context=ctx.context)

    if result.final_output.is_wrong:
        return
    else:
        websocket = ctx.context["websocket"]
        return await websocket.send_json({"new_checkpoint_content": new_checkpoint_content})


class ChecklistAppenderAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.agenda_agent = Agent(
            name="Checklist appender",
            instructions=(
                "Based on the checklist provided in the agenda and transcription of already passed meeting, try to update the checklist,"
                "add topics to be covered if they arise from the conversation, send them to the WebSocket server using the function."
                "If you do not see a need to add additional items to the checklist, just say it."

            ),
            tools=[send_checkpoint_via_websocket],
        )
        # Initial chat history will be updated when we receive the agenda info
        self.chat_history = []

    async def process_final_transcript(self, transcript: str):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.agenda_agent,
            self.chat_history,
            context={"websocket": self.websocket},
        )
        print("Agent output:", result.final_output)

        self.chat_history = result.to_input_list()