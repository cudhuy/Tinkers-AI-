import datetime
from typing import Literal

from pydantic import BaseModel


class AgendaForm(BaseModel):
    title: str
    description: str | None = None
    meeting_duration: datetime.timedelta = datetime.timedelta(minutes=30)
    participants: list[str] | None = None
    type_of_meeting: Literal["Sales Meeting", "Internal Meeting"] | None = None


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


class Message(BaseModel):
    content: str
    role: str = "user"


class ChatRequest(BaseModel):
    agenda: Agenda
    messages: list[Message] = []
