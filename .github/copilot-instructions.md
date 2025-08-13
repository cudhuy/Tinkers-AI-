# Copilot Instructions for TinkerAI (AI Meeting Facilitator)

## Project Overview

- **Purpose:** Real-time meeting facilitation using multi-agent logic, OpenAI APIs, and audio streaming.
- **Architecture:**
  - **Frontend:** Next.js app for user interaction and audio capture.
  - **Backend:** FastAPI server (Python) with WebSocket endpoints, agent orchestration, and OpenAI API integration.
  - **Agents:** Modular Python classes for agenda/timekeeping and topic analysis, coordinated by backend logic.
  - **Data Flow:**
    1. Audio captured in frontend, streamed via WebSocket to backend.
    2. Backend relays audio to OpenAI Realtime API for transcription and TTS.
    3. Transcripts and agenda context routed to agents for analysis and response.
    4. Agent responses prioritized, synthesized to speech, and sent back to frontend for playback.

## Key Files & Directories

- `backend/main.py`: FastAPI app entrypoint, CORS, router setup.
- `backend/routes/`: API endpoints for agenda and conversation (WebSocket for audio/transcription).
- `backend/routes/agenda/` & `backend/routes/conversation/`: Agent logic, prompts, and models.
- `backend/core/openai.py`: OpenAI API client setup.
- `frontend/`: Next.js app (see `frontend/README.md` for dev commands).
- `docs/architecture_design.md`: High-level system and data flow diagrams.

## Developer Workflows

- **Backend:**
  - Install Python deps: `uv pip install -r requirements.txt` (or use `pyproject.toml` with uv)
  - Run server: `python main.py` (from `backend/`)
  - Requires `.env` with `OPENAI_API_KEY`
- **Frontend:**
  - Install deps: `npm install` (from `frontend/`)
  - Start dev server: `npm run dev`
- **Testing:**
  - Backend tests in `backend/tests/` (pytest compatible)

## Project-Specific Patterns & Conventions

- **Agent Pattern:**
  - Agents are Python classes (see `manage_agents.py`, `routes/agenda/`, `routes/conversation/`).
  - Coordinator logic routes context and transcript to agents, prioritizes responses.
  - Agenda/timekeeping agent is rule-based; topic analyzer agent uses OpenAI LLM.
- **WebSocket Usage:**
  - Audio and transcript events flow via `/conversation/transcribe` WebSocket endpoint.
  - Multiple agents process the same transcript in parallel.
- **Prompts:**
  - Prompt templates for agenda and topic analysis in `routes/agenda/prompts.py` and `routes/conversation/prompts.py`.
- **Environment:**
  - Use `.env.example` as template for required environment variables.
- **Dependencies:**
  - Backend: `fastapi`, `openai`, `openai-agents`, `websockets`, `pydantic`, `sounddevice`.
  - Frontend: Next.js, Tailwind CSS, etc.

## Integration & Data

- **Agenda:**
  - Agendas loaded from JSON or form input, passed to agents for context.
- **Audio:**
  - PCM audio chunks streamed from frontend to backend, then to OpenAI API.
- **LLM Calls:**
  - Topic analyzer agent uses OpenAI Chat Completions for relevance checks.

## Example: Adding a New Agent

- Create agent class in `backend/routes/conversation/agent.py` or similar.
- Register agent in the relevant router (see `conversation_router`).
- Update coordinator logic to route context/transcript to new agent.

## References

- See `docs/architecture_design.md` for diagrams and rationale.
- See `docs/implementation_plan.md` for task breakdown and dependencies.
- See `docs/poc_definition.md` for proof of concept.
- See `README.md` (root and frontend) for setup and run instructions.

