from fastapi import APIRouter, Body

from core.openai import client
from routes.agenda.model import Agenda, AgendaForm, Message
from routes.agenda.prompts import AGENDA_CREATION_PROMPT

agenda_router = APIRouter(prefix="/agenda", tags=["agenda"])

conversation = []


@agenda_router.post("/")
async def upload_agenda(
    agenda: AgendaForm = Body(
        example={
        "title": "Sales Strategy Meeting with MedNova Health",
        "time": "01:30:00",
        "participants": ["Emily Chen (Procurement Manager)", "Dr. Lucas Raymond (Medical Director)", "Brian Holt (VP of Innovation)", "Me (Sales Executive at Bards.ai)"],
        "description": "This is a strategic sales meeting with MedNova Health to present our AI-driven data solutions tailored for hospital performance optimization and patient flow analytics. The meeting will include a short demo, discussion around MedNova's current pain points, and outlining a tailored value proposition.",
        "type_of_metting": "Sales Meeting"
        }

    ),
):
    global conversation
    messages = [
        {"role": "system", "content": AGENDA_CREATION_PROMPT},
        {"role": "user", "content": agenda.model_dump_json()},
    ]

    # Generate initial agenda
    completion = client.beta.chat.completions.parse(
        model="gpt-4.1-mini",
        messages=messages,
        response_format=Agenda,
    )
    response = completion.choices[0].message.parsed

    conversation = messages

    return response


@agenda_router.post("/chat")
async def chat_with_agenda(message: Message):
    global conversation
    conversation.append({"role": "assistant", "content": "Modify the generated agenda according to the following user request:"})
    conversation.append({"role": "user", "content": message.content})

    completion = client.beta.chat.completions.parse(
        model="gpt-4.1-mini",
        messages=conversation,
        response_format=Agenda,

    )
    response = completion.choices[0].message.parsed
    conversation.append({"role": "assistant", "content": response})

    return response