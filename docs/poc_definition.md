# 01: Proof of Concept (POC) Definition - AI Meeting Facilitator (Revised)

**Version:** 1.1
**Status:** Final Draft
**Date:** 06-08-2025
**Purpose:** To define the precise scope, minimum viable features, demonstration scenario, and success criteria for the AI Meeting Facilitator POC, developed within a 20-hour hackathon constraint. This version incorporates requirements for agenda handling, LLM-based topic adherence, a multi-agent system, and TTS output as **Must Haves**. This guides the development effort by ruthlessly prioritizing features for a *minimal viable demonstration*.

**Constraint Reminder:** The 20-hour time limit is critical. All "Must Have" features must be implemented in their simplest possible form.

## 1. Core POC Goal (Revised)

To demonstrate a minimal end-to-end flow where:
1.  A predefined meeting agenda is loaded.
2.  Audio input from a simulated participant is captured via a RealTime API and transcribed.
3.  A multi-agent system (using OpenAI Agent SDK) processes the transcript in the context of the current agenda item.
4.  Agents perform basic facilitation tasks (topic announcement, timekeeping, LLM-based topic adherence check).
5.  Relevant agent responses are synthesized into speech using OpenAI TTS and outputted.

## 2. Core End-to-End Flow (Revised - Multi-Agent Focus)

1.  **Pre-Meeting:** Load a simple, predefined agenda file (e.g., plain text or JSON) containing topics, brief descriptions, and estimated times.
2.  **Meeting Start:** The system identifies the first agenda item.
3.  **Agent 1 Action (Agenda/Time Keeper):** Announce the current topic and its allocated time via TTS. Start a simple timer for the topic.
4.  **Input:** Simulate a user speaking.
5.  **Capture:** Client sends audio chunks to the RealTime API endpoint.
6.  **Transmission & Transcription:** RealTime API service receives audio, sends to OpenAI Whisper API for transcription.
7.  **Coordination:** A central coordinator receives the transcript chunk and the current agenda context (topic, description, remaining time).
8.  **Agent Input & Processing:** The coordinator routes the transcript and context to relevant agents:
    *   **Agent 1 (Agenda/Time Keeper):** Receives notification of elapsed time or transcript length to monitor against allocated time.
    *   **Agent 2 (Topic Analyzer):** Receives the transcript segment and the *current agenda item's description*. Uses an LLM call (via OpenAI API) to assess relevance.
9.  **Agent Output Generation:** Agents generate potential responses (text).
    *   *Agent 1:* Generates time warnings (e.g., "2 minutes remaining on [Topic]").
    *   *Agent 2:* Generates relevance feedback (e.g., "Let's stay focused on [Topic]" or potentially no output if on-topic).
10. **Output Selection & Synthesis:** The coordinator selects the highest priority agent response (if any), sends the text to OpenAI TTS API.
11. **Output Delivery:** The synthesized audio (speech) response from the facilitator is played back.
12. **Topic Transition:** When Agent 1's timer expires or upon a simulated trigger, Agent 1 announces the next topic via TTS.

## 3. Agents Schema & Organization

A coordinator-based approach will be used for simplicity in the POC.

*   **Coordinator:**
    *   Manages overall state (current agenda item, time elapsed).
    *   Receives transcripts from the transcription service.
    *   Loads and distributes agenda context.
    *   Routes transcripts/context to appropriate agents.
    *   Receives text outputs from agents.
    *   Prioritizes which agent output (if any) should be spoken.
    *   Calls the TTS service and manages audio playback.
*   **Agent 1: Agenda & Time Keeper:**
    *   *State:* Knows the full agenda, current item index, allocated time for the current item.
    *   *Triggers:* Start of meeting, topic transition, timer thresholds (e.g., halfway point, 1-minute warning, time's up).
    *   *Actions:* Generate text to announce topics/time. Generate text for time warnings. Signal coordinator for topic transition.
    *   *Implementation:* Primarily rule-based logic, using agenda data.
*   **Agent 2: Topic Analyzer:**
    *   *State:* Knows the description of the *current* agenda item.
    *   *Triggers:* Receives a sufficiently long transcript segment from the coordinator.
    *   *Actions:* Construct a prompt for an LLM (e.g., `gpt-3.5-turbo` or `gpt-4o-mini` for speed/cost) asking if the provided transcript segment is relevant to the agenda item description. Process the LLM's response (e.g., simple Yes/No analysis or extracting a brief assessment). Generate text output (e.g., a concise nudge if off-topic).
    *   *Implementation:* Requires OpenAI API call for analysis. Needs careful prompt engineering for efficiency and clarity.

## 4. Feature Prioritization (MoSCoW Method - Revised)

### Must Have (Essential for Revised Core Demo)

*   **M1:** Ability to load a predefined agenda from a simple file format (e.g., `agenda.txt` or `agenda.json` with `topic`, `description`, `time_minutes`).
*   **M2:** Client connects and sends audio chunks to a RealTime API endpoint.
*   **M3:** Integration with OpenAI Whisper API for transcription.
*   **M4:** Implementation of a basic Coordinator component.
*   **M5:** Implementation of **Agent 1 (Agenda & Time Keeper)**:
    *   Announces topics based on loaded agenda.
    *   Provides at least one time warning per topic based on agenda time.
    *   Uses rule-based logic.
*   **M6:** Implementation of **Agent 2 (Topic Analyzer)**:
    *   Receives transcript + current topic description.
    *   Makes an LLM call to assess topic relevance (simplest possible prompt/logic).
    *   Generates a text response indicating relevance (e.g., a simple nudge if off-topic).
*   **M7:** Coordinator routes transcripts/context and selects agent outputs.
*   **M8:** Integration with **OpenAI TTS API** to synthesize selected agent text responses into speech.
*   **M9:** Audio playback of the synthesized TTS response.
*   **M10:** Basic `README.md` with setup (including API keys) and run instructions for the revised demo.

### Should Have (If time permits after Must Haves)

*   **S1:** Basic agenda generation based on simple user text input (e.g., user provides a list of topics, LLM suggests descriptions/times).
*   **S2:** More nuanced LLM response from Topic Analyzer (e.g., suggesting *how* it's off-topic).
*   **S3:** Implement **Agent 3 (Summarizer):** Triggered manually or at end of topic, uses LLM to summarize the discussion for that topic.
*   **S4:** Basic error handling/logging for API calls (Whisper, OpenAI LLM, TTS).
*   **S5:** Displaying the current agenda topic visually (simple console output).

### Could Have (Stretch goals if significantly ahead)

*   **C1:** Mechanism to load participant names; Agent attempts to address someone.
*   **C2:** Basic action item detection using keywords or simple LLM prompt.
*   **C3:** More sophisticated agent interaction/negotiation via the coordinator.
*   **C4:** Handling interruptions or overlapping agent responses more gracefully.

### Won't Have (Explicitly Excluded from this POC)

*   **W1:** Polished User interface.
*   **W2:** Complex/interactive agenda generation or editing during the meeting.
*   **W3:** Analysis of participant expertise from documents.
*   **W4:** Ensuring diverse participation.
*   **W5:** Saving meeting notes/summaries/action points persistently.
*   **W6:** Advanced Project Management functionality.
*   **W7:** Robust handling of poor audio, non-English languages, or overlapping user speech.
*   **W8:** User authentication or multi-meeting management.

## 5. Defined Demo Scenario (Revised)

1.  **Setup:** Ensure `agenda.json` (or similar) is present with at least 2 topics (e.g., Topic 1: "Project Update", 1 min; Topic 2: "Blocker Discussion", 1 min).
2.  **Start:** Run the main application script. Log "AI Facilitator POC Initialized. Loading agenda..."
3.  **Agent 1 Action:** Facilitator speaks (TTS Output): "Starting the meeting. First topic is Project Update. You have 1 minute."
4.  **Simulate User Speech (On Topic):** Send audio chunk (~15s) relevant to "Project Update".
5.  **Observe:** Logs show transcription. Coordinator sends text to Topic Analyzer. Topic Analyzer LLM call assesses as relevant. (Optional: Log shows "Agent 2: On topic"). *No TTS output expected.*
6.  **Simulate User Speech (Off Topic):** Send audio chunk (~15s) clearly irrelevant (e.g., talking about weekend plans).
7.  **Observe:** Logs show transcription. Coordinator sends text to Topic Analyzer. Topic Analyzer LLM call assesses as irrelevant.
8.  **Agent 2 Action:** Facilitator speaks (TTS Output): "Let's stay focused on the Project Update for now."
9.  **Wait/Simulate Time Passing:** Let the 1-minute timer for Topic 1 expire.
10. **Agent 1 Action:** Facilitator speaks (TTS Output): "Time's up for Project Update. Moving to the next topic: Blocker Discussion. You have 1 minute."
11. **End:** Demo concludes after showcasing topic transition.

## 6. POC Success Criteria (Revised)

The POC will be considered successful if:

*   **SC1:** The application runs the **Revised Demo Scenario** (Section 5) end-to-end without crashing.
*   **SC2:** The predefined agenda is successfully loaded and used by Agent 1.
*   **SC3:** Audio chunks -> RealTime API -> Transcription (Whisper) flow is functional.
*   **SC4:** The Coordinator correctly routes information to both Agent 1 and Agent 2.
*   **SC5:** **Agent 1 (Agenda/Time Keeper)** successfully announces topics and triggers topic transition via TTS based on the loaded agenda.
*   **SC6:** **Agent 2 (Topic Analyzer)** successfully uses an LLM call to assess relevance and triggers a corrective TTS response *only* when demo speech is off-topic.
*   **SC7:** **OpenAI TTS** is successfully used for all facilitator speech output.
*   **SC8:** The multi-agent structure (Coordinator, Agent 1, Agent 2) is implemented.
*   **SC9:** Basic setup/run instructions in `README.md` work.