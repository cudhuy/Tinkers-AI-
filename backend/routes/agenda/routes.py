from fastapi import APIRouter, Body

from core.openai import client
from routes.agenda.model import Agenda, Message
from routes.agenda.prompts import AGENDA_CREATION_PROMPT

agenda_router = APIRouter(prefix="/agenda", tags=["agenda"])

conversation = []


@agenda_router.post("/")
async def upload_agenda(
    agenda: Agenda = Body(
        example={
            "title": "Team Weekly Meeting",
            "time": "01:30:00",
            "participants": ["John Doe", "Jane Smith", "Mark Johnson"],
            "description": "Weekly sync meeting for project updates",
        }
    ),
):
    global conversation
    messages = [
        {"role": "system", "content": AGENDA_CREATION_PROMPT},
        {"role": "user", "content": agenda.model_dump_json()},
    ]

    # Generate initial agenda
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    response = completion.choices[0].message.content

    conversation = messages

    return response


@agenda_router.post("/feedback")
async def provide_feedback(message: Message):
    global conversation
    conversation.append({"role": "user", "content": message.content})

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=conversation,
    )
    response = completion.choices[0].message.content
    conversation.append({"role": "assistant", "content": response})

    return response
