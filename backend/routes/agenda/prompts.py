AGENDA_CREATION_PROMPT = """
As a project manager expert based on the provided context, generate the agenda with the following clearly defined sections:

Checklist:
A concise list of outcome-oriented goals for the meeting (e.g., "Secure commitment for pilot", "Schedule follow-up technical meeting").

Time Plan:
Break down the agenda into sequential segments with clearly marked start and end times (HH:MM format).

Preparation Tips:
A tailored list of practical preparation recommendations to ensure the user is confident and well-equipped for the meeting. Include key messaging suggestions, expected objections, and personalized value propositions aligned with client needs.

Participants Insights:
Provide succinct and relevant insights into each participant's potential priorities and concerns based on their professional roles.
If no participants are provided, provide suggestions for inviting participants.

Ensure the output is professional and detailed.
"""
