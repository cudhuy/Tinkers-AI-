# 02: High-Level Architecture & Technology Choices - AI Meeting Facilitator POC (Refined)

**Version:** 1.3
**Status:** Final Draft
**Date:** 06-08-2025
**Purpose:** To outline the refined high-level system architecture, key technology choices, and data flow for the AI Meeting Facilitator POC. This version uses the **OpenAI Realtime API** as the core, incorporates mechanisms for more context-aware time management, and clarifies component responsibilities based on API capabilities identified via targeted search. This guides the technical implementation within the 20-hour hackathon constraint.

## 1. High-Level Architecture Diagram (Conceptual)

This architecture leverages the OpenAI Realtime API for core voice interaction via WebSockets, managed by a custom Python backend acting as a trusted intermediate service. Agent logic resides within this backend, with enhanced coordination for timing interventions.

```mermaid
graph LR
    A[User Microphone] --> B(Client App / WebSocket Client);
    B -- Raw Audio Chunks (PCM) --> C{Backend WebSocket Server (Python)};
    C -- Establish Session & Auth --> D[OpenAI Realtime API (wss://)];
    C -- Send Audio Chunks --> D;
    D -- Events (transcript, speech_stopped, etc.) --> C; %% Key input to Coordinator
    C -- Trigger/Context --> E{Coordinator Logic (Python)};
    E -- Load --> F[Agenda File (agenda.json)];
    E -- Contextual Time Check Request --> G(Agent 1: Agenda/Time Keeper Logic);
    E -- Transcript + Topic Desc --> H(Agent 2: Topic Analyzer Logic);
    H -- Prompt --> I[OpenAI Chat Completions API (REST)];
    I -- Relevance Assessment --> H;
    %% Optional LLM Call for Agent 1 (Should Have)
    G -- Optional: Nuance Prompt --> I;
    I -- Optional: Nuanced Phrasing/Suggestion --> G;
    G -- Text Response / Suggestion --> E;
    H -- Text Response --> E;
    E -- Prioritized Text for TTS --> D; %% Sends 'response.create' event via WebSocket
    D -- Synthesized Audio Chunks --> C;
    C -- Relay Audio Chunks --> B;
    B -- Playback --> J[User Speaker];

    style D fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style E fill:#ccf,stroke:#333,stroke-width:2px
    style G fill:#ccf,stroke:#333,stroke-width:2px
    style H fill:#ccf,stroke:#333,stroke-width:2px

    linkStyle 10 stroke-dasharray: 5 5; %% Dashed line for optional LLM call
    linkStyle 11 stroke-dasharray: 5 5; %% Dashed line for optional LLM call
```

**Key:**

*   Pink Boxes: External OpenAI APIs
*   Blue Boxes: Components built by the hackathon team (Python Backend)
*   Dashed Lines: Optional/Stretch Goal functionality (LLM for Agent 1)

## 2. Component Descriptions

1.  **Client App / WebSocket Client:**
    *   *Responsibility:* Capture audio (PCM 16-bit, 24kHz mono recommended [3]), send via WebSocket to Backend Server, receive synthesized audio chunks, play back audio.
    *   *Technology:* Python script (`sounddevice` + `websockets`) or minimal web app (JS `MediaRecorder` + `WebSocket`).
2.  **Backend WebSocket Server (Python):**
    *   *Responsibility:* Acts as the required **trusted intermediate service** [1, 5, 14, 36]. Manages client connections. Hosts Coordinator Logic. Establishes/manages secure WebSocket connection to OpenAI Realtime API (`/realtime`). Relays audio/events between Client and Realtime API.
    *   *Technology:* FastAPI/Flask with `websockets` library.
3.  **Coordinator Logic (Python Module/Class):**
    *   *Responsibility:* Central orchestration within the backend.
        *   Loads/parses `agenda.json`.
        *   Initiates and manages the Realtime API session and handles its lifecycle events.
        *   **Crucially, processes events from Realtime API**, especially `transcript.items` and `input_audio_buffer.speech_stopped` [12, 18, 31, 34] to understand conversational flow.
        *   Tracks meeting state (current agenda item, start time).
        *   **Decides *when* to intervene based on flow:** Triggers Agent 1 (Time Keeper) for time checks *only* during appropriate moments (e.g., after detecting speech has stopped via `speech_stopped` event).
        *   Triggers Agent 2 (Topic Analyzer) based on received transcripts.
        *   Receives text responses (or structured suggestions) from Agents 1 & 2.
        *   Prioritizes agent outputs (Time warnings might take precedence).
        *   Handles potential suggestions from Agent 1 (e.g., logs suggestion, potentially announces it).
        *   Sends the chosen text response back into the Realtime API session using a `response.create` event [1, 16, 36] for internal TTS synthesis.
        *   Manages agenda topic transitions based on signals from Agent 1 or time expiry.
    *   *Technology:* Custom Python code within the Backend Server.
4.  **Agent 1: Agenda & Time Keeper Logic (Python Module/Function):**
    *   *Responsibility:* Calculates elapsed time vs. allocated time for the current topic. Generates text outputs for topic announcements/warnings. Signals Coordinator for topic transitions.
        *   **Timing Nuance (Must Have):** Provides the *content* for time updates when requested by the Coordinator (which handles *when* to request/deliver it).
        *   **Contextual Phrasing / Agenda Adaptation (Should Have):** Can be enhanced to use the Chat Completions API (like Agent 2) to:
            *   Phrase warnings more naturally based on context provided by the Coordinator.
            *   Suggest simple agenda adjustments (e.g., extend time by X minutes) in its response to the Coordinator.
    *   *Technology:* Primarily rule-based Python logic (Must Have). Optionally uses `openai` library for Chat Completions (Should Have).
5.  **Agent 2: Topic Analyzer Logic (Python Module/Function):**
    *   *Responsibility:* Receives transcript segment + topic description from Coordinator. Formats prompt for relevance check. Calls the **OpenAI Chat Completions API** (REST endpoint) for analysis. Parses LLM response. Generates concise text output if off-topic.
    *   *Technology:* Python function using `openai` library to call `openai.chat.completions.create`.
6.  **OpenAI Realtime API:**
    *   *Responsibility:* Low-latency, speech-to-speech processing [1, 2, 4, 17]. Accessed via secure WebSocket from our backend [1, 2, 36]. Handles internal STT, VAD, turn detection, interruption handling [2, 3, 4, 16, 29, 31]. Synthesizes text provided via `response.create` events back into speech using internal TTS [1, 16, 36]. Provides crucial events like `input_audio_buffer.speech_stopped` for flow control.
    *   *Technology:* External OpenAI service. Model: `gpt-4o-mini-realtime-preview` (recommended for POC) [1, 2, 17, 38].
7.  **OpenAI Chat Completions API:**
    *   *Responsibility:* Provides standard LLM reasoning for Agent 2's topic relevance check *and* optionally for Agent 1's contextual phrasing/suggestion enhancement. This is a separate REST API call.
    *   *Technology:* External OpenAI REST API. Model: `gpt-4o-mini` (recommended for POC) [34].

## 3. Technology Stack Choices

*   **Language:** Python 3.10+
*   **Backend Framework:** FastAPI (or Flask) with `websockets` library.
*   **Real-time Communication:** WebSockets (Client <-> Backend, Backend <-> OpenAI Realtime API).
*   **Audio I/O (Client):** `sounddevice` (Python) or Web Audio API (JS).
*   **Audio Format:** PCM 16-bit, 24kHz, 1 channel, little-endian (recommended for Realtime API) [3].
*   **Core AI Voice Interaction:** OpenAI Realtime API (`gpt-4o-mini-realtime-preview`).
*   **Agent LLM Logic:** OpenAI Chat Completions API (`gpt-4o-mini`).
*   **Speech Synthesis:** Handled internally by OpenAI Realtime API.
*   **OpenAI Client Library:** `openai` Python library (for Chat Completions calls by Agent 2 and optionally Agent 1). Manual WebSocket handling for Realtime API interaction.
*   **Agenda Storage:** JSON file (`agenda.json`).

## 4. API / Data Flow (Simplified & Refined)

This section details the primary data structures and message formats exchanged between components.

**4.1. Client <-> Backend Server (WebSocket)**

*   **Client -> Server: Audio Chunk**
    *   **Format:** Binary WebSocket message containing raw audio bytes.
    *   **Payload:** Raw PCM data (e.g., 16-bit signed integers, little-endian, 24000 Hz, 1 channel). Chunk size determined by client (e.g., 100ms-500ms worth of samples).
*   **Server -> Client: Synthesized Audio Chunk**
    *   **Format:** Binary WebSocket message containing synthesized audio bytes received from OpenAI Realtime API.
    *   **Payload:** Audio bytes in the format specified by OpenAI Realtime API output (e.g., Opus or other). The server simply relays these chunks.

**4.2. Backend Server <-> OpenAI Realtime API (WebSocket)**

*   **Server -> Realtime API: Configuration & Control Messages**
    *   **Type:** JSON text messages over WebSocket.
    *   **Examples:**
        *   Session Initiation (Simplified concept):
            ```json
            {
              "type": "session.create",
              "config": {
                "input_audio_buffer": { "sample_rate": 24000, "num_channels": 1, "sample_format": "int16le" },
                "output_audio_buffer": { "encoding": "opus" }, // Or other supported formats
                "llm": { "model": "gpt-4o-mini-realtime-preview" },
                "stt": { "model": "whisper-large-v3" }, // Or default
                "tts": { "model": "tts-1", "voice": "alloy" } // Or default
              },
              "auth": { "api_key": "YOUR_OPENAI_API_KEY" }
            }
            ```
        *   Sending Audio Data:
            ```json
            {
              "type": "input_audio_buffer.chunk",
              "payload": "BASE64_ENCODED_RAW_PCM_CHUNK_BYTES" // Or send as binary frame
            }
            ```
            *(Note: API might require binary frames directly after an initial text setup frame)*
        *   Sending Text for Synthesis (Agent Response):
            ```json
            {
              "type": "response.create",
              "text": "This is the text the agent wants synthesized."
            }
            ```
        *   Session Termination:
            ```json
            { "type": "session.destroy" }
            ```
*   **Realtime API -> Backend Server: Events**
    *   **Type:** JSON text messages over WebSocket.
    *   **Examples (Structure illustrative based on common patterns):**
        *   Session Created:
            ```json
            { "type": "session.created", "session_id": "sess_abc123" }
            ```
        *   Transcript Item (Partial or Final):
            ```json
            {
              "type": "transcript.items",
              "items": [
                { "text": "hello ", "start_time": 0.1, "end_time": 0.5, "is_final": false },
                { "text": "world", "start_time": 0.6, "end_time": 1.0, "is_final": true }
              ],
              "timestamp": "2025-04-25T17:00:01Z"
            }
            ```
        *   Speech Stopped Detected:
            ```json
            {
              "type": "input_audio_buffer.speech_stopped",
              "reason": "silence_detected", // Or "endpoint_detected"
              "timestamp": "2025-04-25T17:00:02Z"
            }
            ```
        *   Synthesized Audio Chunk:
            ```json
            {
              "type": "audio_output_buffer.chunk",
              "payload": "BASE64_ENCODED_SYNTHESIZED_AUDIO_CHUNK_BYTES", // Or received as binary frame
              "sequence_id": 123
            }
            ```
        *   Response Done (Indicates end of synthesis for a `response.create`):
            ```json
            { "type": "response.done", "response_id": "resp_xyz789" }
            ```
        *   Error:
            ```json
            { "type": "error", "code": 4001, "message": "Authentication failed." }
            ```
    *(Note: Exact event names and payload structures must be verified against the latest official OpenAI Realtime API documentation.)*

**4.3. Coordinator <-> Agent 1 (Time Keeper) Logic (Internal Python Function/Method Call)**

*   **Coordinator -> Agent 1: Request Time Check/Update**
    *   **Function Signature (Example):** `check_time(current_agenda_item: dict, elapsed_topic_time: float, conversation_context: dict = None) -> dict`
    *   **Input Parameters:**
        *   `current_agenda_item`: Dictionary representing the current item from `agenda.json` (contains `topic`, `description`, `time_minutes`).
        *   `elapsed_topic_time`: Float, seconds elapsed since the current topic started.
        *   `conversation_context` (Optional): Dictionary with recent transcript snippets or state if needed for nuanced phrasing (relevant for "Should Have" enhancement).
*   **Agent 1 -> Coordinator: Response/Suggestion**
    *   **Return Value (Dictionary):**
        ```python
        {
          "text": Optional[str],  # Text to be spoken (e.g., "1 minute left on Project Update."), None if no output needed.
          "priority": int,        # Priority level (e.g., 1=High, 2=Medium, 3=Low), 0 if no text.
          "signal": Optional[str], # Signal for Coordinator (e.g., "TransitionTopic", "TimesUp"), None otherwise.
          "suggestion": Optional[dict] # For "Should Have" enhancement (e.g., {"type": "extend_time", "minutes": 2}), None otherwise.
        }
        ```

**4.4. Coordinator <-> Agent 2 (Topic Analyzer) Logic (Internal Python Function/Method Call)**

*   **Coordinator -> Agent 2: Request Relevance Analysis**
    *   **Function Signature (Example):** `analyze_relevance(transcript_segment: str, current_topic_description: str) -> dict`
    *   **Input Parameters:**
        *   `transcript_segment`: String containing the recent transcript text to analyze.
        *   `current_topic_description`: String containing the description of the current agenda item.
*   **Agent 2 -> Coordinator: Analysis Result**
    *   **Return Value (Dictionary):**
        ```python
        {
          "text": Optional[str], # Text to be spoken if off-topic (e.g., "Let's keep the focus on Blockers."), None if relevant.
          "priority": int,       # Priority level (e.g., 2), 0 if no text.
          "is_relevant": bool   # True if deemed relevant, False otherwise.
        }
        ```

**4.5. Agent Logic <-> OpenAI Chat Completions API (REST)**

*   **Agent (1 or 2) -> Chat Completions API: Request**
    *   **Method:** `POST`
    *   **Endpoint:** `https://api.openai.com/v1/chat/completions`
    *   **Headers:** `Authorization: Bearer YOUR_OPENAI_API_KEY`, `Content-Type: application/json`
    *   **Body (Example for Agent 2):**
        ```json
        {
          "model": "gpt-4o-mini",
          "messages": [
            {
              "role": "system",
              "content": "You are an assistant analyzing meeting transcripts. Determine if the user's text is relevant to the current agenda topic. Respond ONLY with 'Relevant' or 'Off-topic'."
            },
            {
              "role": "user",
              "content": "Current Topic Description: 'Identify and discuss any current blockers.'\n\nUser Transcript Segment: 'Yeah, the main issue is the CI/CD pipeline failing on the integration tests.'"
            }
          ],
          "max_tokens": 5,
          "temperature": 0.1
        }
        ```
*   **Chat Completions API -> Agent (1 or 2): Response**
    *   **Status Code:** `200 OK`
    *   **Body (Example):**
        ```json
        {
          "id": "chatcmpl-...",
          "object": "chat.completion",
          "created": 1677652288,
          "model": "gpt-4o-mini-...",
          "choices": [
            {
              "index": 0,
              "message": {
                "role": "assistant",
                "content": "Relevant"
              },
              "finish_reason": "stop"
            }
          ],
          "usage": { ... }
        }
        ```

*(Note: Specific parameters like `max_tokens`, `temperature`, and system prompts need tuning during development.)*
## 5. Agent System Design (Coordinator Pattern - Refined)

*   **Coordinator:** Central hub managing the Realtime API connection and its event stream. Crucially uses events like `input_audio_buffer.speech_stopped` to determine appropriate timing for interventions. Routes data to agents based on events and state. Prioritizes agent responses/suggestions. Executes TTS by sending `response.create` events back to the Realtime API. Manages overall meeting flow and agenda state, potentially acting on simple suggestions from Agent 1.
*   **Agent 1 (Time Keeper):** Calculates time and generates *content* for time-related announcements/warnings upon request from Coordinator. Can be enhanced (**Should Have**) with an LLM call (via Chat Completions) for more natural phrasing or suggesting simple agenda changes in its response structure. Relies on Coordinator for *when* to speak.
*   **Agent 2 (Topic Analyzer):** Analyzes transcript relevance against the current topic description using a direct call to the Chat Completions API. Returns simple feedback text to Coordinator.

This refined architecture leverages the strengths of the Realtime API for seamless audio handling and uses its event model to enable more context-aware timing interventions managed by the Coordinator, keeping the agent logic focused but allowing for optional LLM enhancements.
