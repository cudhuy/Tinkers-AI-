import datetime

from pydantic import BaseModel


class AgendaForm(BaseModel):
    title: str
    time: datetime.timedelta
    participants: list[str]
    description: str | None = None


class Message(BaseModel):
    content: str


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
