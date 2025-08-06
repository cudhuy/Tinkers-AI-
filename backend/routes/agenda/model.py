import datetime

from pydantic import BaseModel


class Agenda(BaseModel):
    title: str
    time: datetime.timedelta
    participants: list[str]
    description: str | None = None


class Message(BaseModel):
    content: str
