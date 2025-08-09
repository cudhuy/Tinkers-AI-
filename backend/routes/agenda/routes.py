from core.openai import client
from fastapi import APIRouter, Body
from routes.agenda.model import Agenda, AgendaForm, ChatRequest
from routes.agenda.prompts import AGENDA_CREATION_PROMPT

agenda_router = APIRouter(prefix="/agenda", tags=["agenda"])


@agenda_router.post("/")
async def upload_agenda(
    agenda: AgendaForm = Body(
        example={
            "title": "Sales Strategy Meeting with MedNova Health",
            "meeting_duration": "01:30:00",
            "participants": [
                "Emily Chen (Procurement Manager)",
                "Dr. Lucas Raymond (Medical Director)",
                "Brian Holt (VP of Innovation)",
                "Me (Sales Executive at Bards.ai)",
            ],
            "description": "This is a strategic sales meeting with MedNova Health to present our AI-driven data solutions tailored for hospital performance optimization and patient flow analytics. The meeting will include a short demo, discussion around MedNova's current pain points, and outlining a tailored value proposition.",
            "type_of_metting": "Sales Meeting",
        }
    ),
):
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

    return response


@agenda_router.post("/chat")
async def chat_with_agenda(chat_request: ChatRequest):
    # Create the conversation history from the messages in the request
    messages = [
        {"role": "system", "content": AGENDA_CREATION_PROMPT},
        {"role": "assistant", "content": chat_request.agenda.model_dump_json()},
    ]

    # If we have a current agenda, include it in the prompt
    if chat_request.agenda:
        agenda_json = chat_request.agenda.model_dump_json()
        messages.append(
            {
                "role": "user",
                "content": f"Here is the current agenda: {agenda_json}",
            }
        )

    # Add all messages from the request
    for message in chat_request.messages:
        messages.append({"role": message.role, "content": message.content})

    messages.append(
        {
            "role": "system",
            "content": "Please update or explain the agenda based on the user's request.",
        }
    )

    # Generate updated agenda based on conversation history
    completion = client.beta.chat.completions.parse(
        model="gpt-4.1-mini",
        messages=messages,
        response_format=Agenda,
    )
    response = completion.choices[0].message.parsed

    return response
