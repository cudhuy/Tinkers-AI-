# 03: Implementation & Task Breakdown Plan - AI Meeting Facilitator POC

**Version:** 1.0
**Status:** Draft
**Date:** 06-08-2025
**Purpose:** To break down the architecture defined in Phase 2 (`02_Architecture_Design.md`) into actionable development tasks for the 20-hour hackathon. This includes task definition, dependencies, suggested ownership areas, a proposed timeline, and basic Git strategy.

**Reference:** This plan implements the architecture based on the OpenAI Realtime API, as detailed in `PLANNING/02_Architecture_Design.md`, aiming to fulfill the Must-Have requirements defined in `PLANNING/01_POC_Definition.md`.

## 1. Task Decomposition

Tasks are broken down by component or core functionality. Estimated effort assumes focused work and familiarity with Python/APIs. Dependencies list prerequisite Task IDs.

| Task ID     | Component / Functionality        | Task Description                                                                                                                    | Estimated Effort (Hours) | Dependencies               | Suggested Lead/Area        |
| :---------- | :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :------------------------- | :------------------------- |
| **BK-01**   | Backend Server                   | Setup basic FastAPI/Flask application structure with WebSocket endpoint (`/ws`).                                                    | 1                        | -                          | Backend Infra Lead         |
| **BK-02**   | Backend Server                   | Implement basic environment variable handling for API keys (`.env` file).                                                           | 0.5                      | BK-01                      | Backend Infra Lead         |
| **BK-03**   | Backend Server / Logging         | Setup basic logging framework (e.g., Python `logging`) to output key events and errors to console.                                  | 1                        | BK-01                      | Backend Infra Lead         |
| **CL-01**   | Client App (Python)              | Create basic Python script to capture microphone audio using `sounddevice`.                                                         | 1.5                      | -                          | Client / Audio Lead        |
| **CL-02**   | Client App (Python)              | Implement WebSocket client connection to Backend Server (`ws://...`).                                                               | 1                        | CL-01                      | Client / Audio Lead        |
| **CL-03**   | Client App (Python)              | Stream captured audio chunks (PCM format) via WebSocket to the Backend Server.                                                      | 1.5                      | CL-01, CL-02               | Client / Audio Lead        |
| **CL-04**   | Client App (Python)              | Implement receiving audio chunks from Backend Server via WebSocket and playing them back using `sounddevice` or `playsound`.        | 1.5                      | CL-02                      | Client / Audio Lead        |
| **RT-01**   | Realtime API Integration         | Implement WebSocket connection *from* Backend Server *to* OpenAI Realtime API endpoint (`wss://...`). Handle authentication.        | 2                        | BK-01, BK-02               | Realtime / OpenAI Lead     |
| **RT-02**   | Realtime API Integration         | Implement sending audio chunks received from the Client *through* the Backend Server *to* the Realtime API WebSocket.               | 1.5                      | BK-01, RT-01               | Realtime / OpenAI Lead     |
| **RT-03**   | Realtime API Integration         | Implement receiving events (esp. `transcript.items`, `input_audio_buffer.speech_stopped`) from Realtime API and logging them.       | 2                        | RT-01, BK-03               | Realtime / OpenAI Lead     |
| **RT-04**   | Realtime API Integration         | Implement receiving synthesized audio chunks (`audio_output_buffer.chunk`) from Realtime API and forwarding to connected Client(s). | 1.5                      | RT-01, CL-04               | Realtime / OpenAI Lead     |
| **RT-05**   | Realtime API Integration         | Implement sending `response.create` events (containing agent text) to the Realtime API for TTS synthesis.                           | 1                        | RT-01                      | Realtime / OpenAI Lead     |
| **AG-01**   | Agenda Loader                    | Create function/class to load and parse `agenda.json` file into a Python dictionary/list.                                           | 0.5                      | -                          | Coordinator / Agent Lead   |
| **CO-01**   | Coordinator Logic                | Implement basic state management (current agenda item index, topic start time). Initialize by loading agenda via AG-01.             | 1                        | BK-01, AG-01               | Coordinator / Agent Lead   |
| **CO-02**   | Coordinator Logic                | Integrate received Realtime API events (from RT-03) into Coordinator state/flow (e.g., store transcripts, detect speech stop).      | 1.5                      | CO-01, RT-03               | Coordinator / Agent Lead   |
| **CO-03**   | Coordinator Logic                | Implement triggering Agent 1 (Time Keeper) based on state and `speech_stopped` events. Pass required context.                       | 1                        | CO-02, A1-01               | Coordinator / Agent Lead   |
| **CO-04**   | Coordinator Logic                | Implement triggering Agent 2 (Topic Analyzer) based on received transcripts. Pass required context.                                 | 1                        | CO-02, A2-01               | Coordinator / Agent Lead   |
| **CO-05**   | Coordinator Logic                | Implement logic to receive responses from Agents 1 & 2, prioritize them, and send selected text via RT-05 for synthesis.            | 1.5                      | CO-03, CO-04, RT-05        | Coordinator / Agent Lead   |
| **CO-06**   | Coordinator Logic                | Implement basic topic transition logic based on signals from Agent 1 or timer expiry.                                               | 1                        | CO-01, A1-01               | Coordinator / Agent Lead   |
| **A1-01**   | Agent 1: Time Keeper (Rules)     | Implement core rule-based logic: calculate elapsed time, check against agenda item time, generate simple text responses/signals.    | 1.5                      | AG-01                      | Coordinator / Agent Lead   |
| **A1-02**   | Agent 1: Time Keeper (Announce)  | Implement text generation for announcing new topics.                                                                                | 0.5                      | A1-01                      | Coordinator / Agent Lead   |
| **A2-01**   | Agent 2: Topic Analyzer (Core)   | Implement function signature receiving transcript & topic description.                                                              | 0.5                      | -                          | Coordinator / Agent Lead   |
| **A2-02**   | Agent 2: Topic Analyzer (LLM)    | Integrate call to OpenAI Chat Completions API (using `openai` library): format prompt, make request, basic response parsing.        | 2                        | A2-01, BK-02               | Coordinator / Agent Lead   |
| **A2-03**   | Agent 2: Topic Analyzer (Output) | Implement logic to generate output text structure (including relevance flag and nudge text) based on LLM response.                  | 1                        | A2-01, A2-02               | Coordinator / Agent Lead   |
| **DOC-01**  | Documentation                    | Create initial `README.md` with project description, basic setup (env vars, Python deps).                                           | 1                        | -                          | DevOps / Docs Lead         |
| **DOC-02**  | Documentation                    | Update `README.md` with final setup and run instructions for the demo.                                                              | 1                        | ALL OTHERs                 | DevOps / Docs Lead         |
| **INT-01**  | Integration                      | Integrate Client App audio sending (CL-03) with Backend receiving & forwarding to Realtime API (RT-02). Verify via logs.            | 1                        | CL-03, RT-02               | Integration Lead           |
| **INT-02**  | Integration                      | Integrate Realtime API transcript events (RT-03) into Coordinator (CO-02) and trigger Agent 2 (CO-04, A2-03). Verify LLM call.      | 1.5                      | RT-03, CO-02, CO-04, A2-03 | Integration Lead           |
| **INT-03**  | Integration                      | Integrate Agent 1 & 2 responses into Coordinator (CO-05), TTS triggering (RT-05), and audio playback on Client (CL-04, RT-04).      | 2                        | CO-05, RT-05, CL-04, RT-04 | Integration Lead           |
| **TEST-01** | Testing                          | Perform end-to-end testing based on the Defined Demo Scenario (`01_POC_Definition.md`). Identify and log bugs.                      | 2                        | INT-01, INT-02, INT-03     | Whole Team                 |
| **BUG-01**  | Bug Fixing                       | Address critical bugs identified during testing to ensure demo stability.                                                           | (As needed)              | TEST-01                    | Whole Team                 |
| **DEMO-01** | Demo Prep                        | Prepare final demo script, ensure environment is stable.                                                                            | 1                        | TEST-01                    | Whole Team                 |
| *(S)-A1-03* | *Stretch: Agent 1 (LLM)*         | *(Optional)* Implement LLM call within Agent 1 for nuanced phrasing/suggestions.                                                    | *(2-3)*                  | *A1-01, A2-02*             | *Coordinator / Agent Lead* |

**Total Estimated Core Effort (Must Haves + Integration + Docs/Demo):** ~35-40 person-hours. With a team of 5 over 20 hours (100 person-hours available), this leaves buffer for challenges, parallel work inefficiencies, testing, and bug fixing, but requires focused effort.

## 2. Identified Dependencies

Dependencies are listed in the table above (Task ID prerequisites). Key dependency chains:

*   **Audio In:** `CL-01` -> `CL-02` -> `CL-03` -> `BK-01` -> `RT-01` -> `RT-02` -> `INT-01`
*   **Transcription -> Agent 2:** `RT-01` -> `RT-03` -> `CO-01` -> `CO-02` -> `A2-01` -> `A2-02` -> `A2-03` -> `CO-04` -> `INT-02`
*   **Agent -> TTS -> Audio Out:** `A1-01`/`A2-03` -> `CO-03`/`CO-04` -> `CO-05` -> `RT-01` -> `RT-05` -> `RT-04` -> `CL-02` -> `CL-04` -> `INT-03`
*   **Core Backend/Coordinator:** Needs `BK-01`, `AG-01`, `RT-03` before main logic (`CO-xx`) can be fully integrated.

## 3. Skill Mapping & Ownership Areas (Suggested)

Assign leads/pairs based on team strengths during the planning meeting. Clear ownership is vital.

*   **Backend Infra / DevOps / Docs:** (Lead for BK-01, BK-02, BK-03, DOC-01, DOC-02) - Needs Python, FastAPI/Flask (optional), basic Docker/env setup.
*   **Client / Audio Handling:** (Lead for CL-01 to CL-04) - Needs Python, `sounddevice`, WebSockets (client).
*   **Realtime API / OpenAI Integration:** (Lead for RT-01 to RT-05) - Needs Python, WebSockets (server/client), understanding async, careful reading of OpenAI Realtime API docs.
*   **Coordinator / Agent Logic:** (Lead for CO-01 to CO-06, AG-01, A1-01, A1-02, A2-01 to A2-03) - Needs strong Python, application logic design, state management, LLM prompt basics, OpenAI Chat Completions API.
*   **Integration / Testing:** (Shared responsibility, potentially led by Backend or Coordinator lead) - Needs understanding of all parts, methodical testing approach.

*Team members should ideally pair up or swarm on complex areas like Realtime API integration and Coordinator logic.*

## 4. Timeline & Checkpoints (Draft for 20 Hours)

*   **Hour 0-1:** Final Planning, Task Assignment, Setup Dev Environments, Git Repo Init.
*   **Hour 1-4 (Milestone 1: Basic Connections):**
    *   Backend server running (BK-01).
    *   Client connects to Backend via WebSocket (CL-02).
    *   Backend connects to Realtime API (RT-01, requires API key setup BK-02).
    *   Basic audio streaming Client -> Backend -> Realtime API (CL-03, RT-02). Verify via logs (BK-03). **Goal: Data flowing one way.**
*   **Hour 4-8 (Milestone 2: Transcription & Basic Agents):**
    *   Realtime API sends transcripts back (RT-03).
    *   Coordinator receives transcripts (CO-02).
    *   Agenda loaded (AG-01, CO-01).
    *   Agent 1 basic logic implemented (A1-01).
    *   Agent 2 makes LLM call (A2-01, A2-02, A2-03). **Goal: Core agent logic callable.**
*   **Hour 8-12 (Milestone 3: Basic End-to-End - Text):**
    *   Coordinator triggers Agents (CO-03, CO-04).
    *   Coordinator selects agent response (CO-05).
    *   Basic topic transitions work (CO-06).
    *   Selected text logged. **Goal: See text output for demo scenario.**
*   **Hour 12-16 (Milestone 4: Full End-to-End - Voice):**
    *   Agent text sent for synthesis via Realtime API (RT-05).
    *   Synthesized audio received (RT-04).
    *   Audio played back on client (CL-04).
    *   **Integration Tasks INT-01, INT-02, INT-03 completed.** **Goal: Demo scenario works with voice.**
*   **Hour 16-18 (Testing & Bug Fixing):**
    *   Rigorous testing (TEST-01).
    *   Address critical bugs (BUG-01).
*   **Hour 18-20 (Polish & Demo Prep):**
    *   Final README update (DOC-02).
    *   Clean up code / add comments where needed.
    *   Prepare final demo run (DEMO-01).

## 5. Git Strategy

*   **Repository:** GitHub / GitLab / etc.
*   **Main Branch:** `main` (or `master`) - Should always represent the most stable, integrated state (ideally working). Protected.
*   **Feature Branches:** Create branches for significant tasks or components (e.g., `feature/realtime-integration`, `feature/agent-timekeeper`, `feature/client-audio`). Use descriptive names.
*   **Workflow:**
    1.  Pull latest `main`.
    2.  Create feature branch from `main`.
    3.  Implement task(s) on feature branch. Commit frequently with clear messages.
    4.  Push feature branch regularly.
    5.  When ready for integration, create a Pull Request (PR) from the feature branch to `main`.
    6.  Require at least one reviewer (another team member) for PRs merging significant logic.
    7.  Merge PR into `main` **only after** basic checks/tests pass. Resolve conflicts locally before merging.
*   **Tagging:** Optionally tag commits corresponding to major milestones.

This detailed breakdown should allow the team to quickly assign tasks and start working in parallel during the hackathon. Remember to communicate frequently and integrate often!
