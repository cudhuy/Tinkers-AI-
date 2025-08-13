import asyncio
from typing import Any, Dict, Optional

from agents import (
    Agent,
    RunContextWrapper,
    Runner,
    function_tool,
)
from fastapi import WebSocket
from pydantic import BaseModel

from routes.conversation.prompts import CHECKLIST_PROMPT, OFFTOPIC_PROMPT


class IsWrong(BaseModel):
    is_wrong: bool
    reasoning: str


@function_tool
async def send_via_websocket(ctx: RunContextWrapper, checkpoint_fulfilled: int) -> str:
    websocket = ctx.context["websocket"]
    return await websocket.send_json({"checkpoint_fulfilled": checkpoint_fulfilled})


@function_tool
async def send_offtopic_warning(
    ctx: RunContextWrapper, is_offtopic: bool, topic: str
) -> str:
    """Send an off-topic warning notification via WebSocket if the conversation is off-topic."""
    websocket = ctx.context["websocket"]
    return await websocket.send_json({"is_offtopic": is_offtopic, "off_topic": topic})


@function_tool
async def send_topic_status(
    ctx: RunContextWrapper,
    is_offtopic: bool,
    topic_summary: str,
    relevant_agenda_item: Optional[str] = None,
    recommendation: Optional[str] = None,
) -> str:
    """Send a comprehensive topic status update via WebSocket with information about the current discussion."""
    websocket = ctx.context["websocket"]
    return await websocket.send_json(
        {
            "is_offtopic": is_offtopic,
            "topic_summary": topic_summary,
            "relevant_agenda_item": relevant_agenda_item,
            "recommendation": recommendation,
        }
    )


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
                await self.transcript_queue.get()

                # Example: You could send this to another AI service for further processing
                await self.process_final_transcript()

                # Mark the task as done
                self.transcript_queue.task_done()

                await asyncio.sleep(0.01)

            except Exception as e:
                print(f"Error in transcript processing: {e}")
                # Don't break the loop on error, continue processing
                continue

    async def process_final_transcript(self):
        """Process a final transcript - can be extended with custom logic"""
        # This is where you could add additional processing for final transcripts
        # For example, sending to a chatbot service, analyzing sentiment, etc.
        pass


class AgendaAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.agenda_agent = Agent(
            name="Agenda Agent",
            model="gpt-4.1",
            instructions=(CHECKLIST_PROMPT),
            tools=[send_via_websocket],
        )
        # Initial chat history will be updated when we receive the agenda info
        self.chat_history = []

    async def process_final_transcript(self):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.agenda_agent,
            self.chat_history,
            context={"websocket": self.websocket},
        )
        print("Agenda Agent output:", result.final_output)

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

    async def process_final_transcript(self):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        for i, message in enumerate(self.chat_history[::-1]):
            print(message)
            if "role" in message and message["role"] == "user":
                n_words = len(message["content"].split())
                break

        result = await Runner.run(
            self.engagement_agent,
            self.chat_history,
            context={
                "websocket": self.websocket,
                "n_words": n_words,
            },
        )
        print("Engagement Agent output:", result.final_output)

        self.chat_history = result.to_input_list()


class OfftopicAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.offtopic_agent = Agent(
            name="Offtopic Agent",
            model="gpt-4.1",
            instructions=(OFFTOPIC_PROMPT),
            tools=[send_topic_status],
        )
        # Initial chat history will be updated when we receive the agenda info
        self.chat_history = []
        # Track the current topic state
        self.current_topic_state = {
            "is_offtopic": False,
            "topic_summary": "",
            "relevant_agenda_item": None,
            "recommendation": None,
        }

    async def process_final_transcript(self):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.offtopic_agent,
            self.chat_history,
            context={"websocket": self.websocket},
        )
        print("Offtopic Agent output:", result.final_output)

        self.chat_history = result.to_input_list()


@function_tool
async def send_checkpoint_via_websocket(
    ctx: RunContextWrapper, new_checkpoint_content: str
) -> str:
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
        return await websocket.send_json(
            {"new_checkpoint_content": new_checkpoint_content}
        )


@function_tool
async def send_conversation_tip_via_websocket(
    ctx: RunContextWrapper, new_conversation_tip: str
) -> str:
    guard_agent = Agent(
        name="Guardrail check",
        instructions="Check if the new conversation tip is aggressive, harmful, dangerous or unrelated.",
        output_type=IsWrong,
    )

    result = await Runner.run(guard_agent, new_conversation_tip, context=ctx.context)

    if result.final_output.is_wrong:
        return
    else:
        websocket = ctx.context["websocket"]
        return await websocket.send_json({"new_conversation_tip": new_conversation_tip})


class ConversationTipsAgent(TranscriptionAgent):
    def __init__(self, websocket: WebSocket):
        super().__init__(websocket)
        self.agenda_agent = Agent(
            name="Conversation Tips",
            model="gpt-4.1",
            instructions=(
                "You are a meeting assistant that provides valuable conversation tips based on the ongoing meeting discussion.\n"
                "Analyze the transcription of the meeting and provide insightful, context-specific tips that would help improve the conversation quality.\n"
                "Tips should focus on improving engagement, communication clarity, or addressing specific communication challenges you observe.\n"
                "Only provide a new tip when you detect a clear opportunity for improvement - do not spam with generic advice.\n"
                "Each tip must be highly valuable, specific to the current conversation context, and actionable.\n"
                "Tips should be concise (1-2 sentences) but impactful.\n"
                "Send the tip if you are 100% confident that very very very very important to the current conversation and send it to the WebSocket server using the provided function. If not just return 'no tips'."
            ),
            tools=[send_conversation_tip_via_websocket],
        )
        # Initial chat history will be updated when we receive the agenda info
        self.chat_history = []

    async def process_final_transcript(self):
        # Only process if we have received agenda information
        if not self.agenda_info and not self.chat_history:
            print("Waiting for agenda information before processing transcripts...")
            return

        result = await Runner.run(
            self.agenda_agent,
            self.chat_history,
            context={"websocket": self.websocket},
        )
        print("Conversation Tips Agent output:", result.final_output)

        self.chat_history = result.to_input_list()
