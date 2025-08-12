from core.openai import client
from fastapi import APIRouter, Body
from routes.agenda.model import Agenda, AgendaForm, ChatRequest, IsAgendaTopic
from routes.agenda.prompts import AGENDA_CREATION_PROMPT, PROFILER_PROMPT
from agents import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    WebSearchTool,
    RunContextWrapper,
    Runner,
    TResponseInputItem,
    input_guardrail,
)


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
            "type_of_meeting": "Sales Meeting",
        }
    ),
):
    messages = [
        {"role": "user", "content": agenda.model_dump_json()},
    ]

    profiler_agent = Agent(
        name="ParticipantProfiler",
        model="gpt-4.1-mini",
        instructions=PROFILER_PROMPT,
        tools=[WebSearchTool()],
    )

    tools = []
    if agenda.type_of_meeting == "Sales Meeting":
        tools.append(
            profiler_agent.as_tool(
                tool_name="profile_meeting_participants",
                tool_description="Search for participant information",
            )
        )

    agenda_agent = Agent(
        name="AgendaCreator",
        model="gpt-4.1-mini",
        instructions=AGENDA_CREATION_PROMPT,
        tools=tools,
        output_type=Agenda,
    )

    result = await Runner.run(
        starting_agent=agenda_agent,
        input=messages,
    )

    # for item in result.new_items:
    #     raw_item = item.raw_item
    #     if isinstance(raw_item, dict) and 'type' in raw_item and raw_item['type'] == 'function_call_output':
    #         if 'output' in raw_item:
    #             print("RAW ITEM OUTPUT", raw_item['output'])
    response = result.final_output

    return response


@agenda_router.post("/chat")
async def chat_with_agenda(chat_request: ChatRequest):
    user_messages = []

    if chat_request.agenda:
        agenda_json = chat_request.agenda.model_dump_json()
        user_messages.append(
            {"role": "user", "content": f"Here is the current agenda: {agenda_json}"}
        )

    # Add all messages from the request
    for message in chat_request.messages:
        user_messages.append({"role": message.role, "content": message.content})

    guardrail_agent = Agent(
        name="Guardrail check",
        instructions="Check if the user is asking specific question about given agenda.",
        output_type=IsAgendaTopic,
    )

    @input_guardrail
    async def agenda_guardrail(
        ctx: RunContextWrapper[None],
        agent: Agent,
        input: str | list[TResponseInputItem],
    ) -> GuardrailFunctionOutput:
        result = await Runner.run(guardrail_agent, input, context=ctx.context)
        return GuardrailFunctionOutput(
            output_info=result.final_output,
            tripwire_triggered=not result.final_output.is_about_agenda,
        )

    agenda_agent = Agent(
        name="AgendaCreator",
        model="gpt-4.1-mini",
        instructions=AGENDA_CREATION_PROMPT,
        tools=[],
        output_type=Agenda,
        input_guardrails=[agenda_guardrail],
    )
    try:
        result = await Runner.run(
            starting_agent=agenda_agent,
            input=user_messages,
        )
        response = result.final_output
        return response

    except InputGuardrailTripwireTriggered:
        return agenda_json
