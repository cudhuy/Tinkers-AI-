from routes.agenda.model import AgendaForm

AGENDA_CREATION_PROMPT = """
As a project manager expert based on the provided context, generate the agenda with the following clearly defined sections:

checklist: A concise list of outcome-oriented goals for the meeting (e.g., "Secure commitment for pilot", "Schedule follow-up technical meeting").

time_plan: Break down the agenda into sequential segments with clearly marked start and end times (HH:MM format), including segments such as introduction, client background review, solution demonstration, Q&A, and wrap-up.

preparation_tips: A tailored list of practical preparation recommendations to ensure the sales executive is confident and well-equipped for the meeting. Include key messaging suggestions, expected objections, and personalized value propositions aligned with client needs.

participants_insights: Provide succinct and relevant insights into each participant's potential priorities and concerns based on their professional roles (e.g., different focal points for Procurement Manager vs. Medical Director).

Ensure the output is professional, detailed, and suitable for internal preparation and stakeholder alignment.
"""
