import datetime
import json
from typing import Literal

from pydantic import BaseModel


class Attachment(BaseModel):
    name: str
    content: str
    type: str


class AgendaForm(BaseModel):
    title: str
    purpose: str
    context: str | None = None
    meeting_duration: datetime.timedelta = datetime.timedelta(minutes=30)
    participants: list[str] | None = None
    type_of_meeting: Literal["Sales Meeting", "Internal Meeting"] | None = None
    attachments: list[Attachment] | None = None

    def to_prompt(self) -> str:
        """
        Convert the agenda form to a JSON string suitable for prompt input.
        Handles timedelta serialization and embeds attachment content in context.
        """
        # Create a dictionary from the model
        data = self.model_dump()

        # Handle timedelta serialization
        if "meeting_duration" in data and isinstance(
            data["meeting_duration"], datetime.timedelta
        ):
            total_seconds = data["meeting_duration"].total_seconds()
            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            seconds = int(total_seconds % 60)
            data["meeting_duration"] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        # Process attachments if they exist
        attachments_content = ""
        if self.attachments:
            attachments_content = "\n\nAttachments provided for reference:\n"
            for idx, attachment in enumerate(self.attachments, 1):
                attachments_content += (
                    f"\n--- Attachment {idx}: {attachment.name} ---\n"
                )
                attachments_content += attachment.content
                attachments_content += "\n--- End of Attachment ---\n"

            # Include attachments in the context
            if data.get("context"):
                data["context"] += attachments_content
            else:
                data["context"] = attachments_content

        # Remove the attachments from the data as the content is now in context
        if "attachments" in data:
            del data["attachments"]

        # Return as JSON string
        return json.dumps(data)


class TimePlanPoint(BaseModel):
    start: str
    end: str
    content: str


class ParticipantInsight(BaseModel):
    participant: str
    insight: str


class Agenda(BaseModel):
    checklist: list[str]
    time_plan: list[TimePlanPoint]
    preparation_tips: list[str]
    participants_insights: list[ParticipantInsight]
    title: str
    attachments: list[Attachment] | None = None


class Message(BaseModel):
    content: str
    role: str = "user"


class ChatRequest(BaseModel):
    agenda: Agenda
    messages: list[Message] = []


class IsAgendaTopic(BaseModel):
    is_about_agenda: bool
    reasoning: str
