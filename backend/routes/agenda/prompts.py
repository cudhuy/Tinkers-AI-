from routes.agenda.model import AgendaForm

AGENDA_CREATION_PROMPT = """
Generate a professional, clear, and compelling sales meeting agenda based on the above info. The agenda should include:
Time plan - Break down the session into clearly defined segments (e.g. intro, client insights, demo, Q&A, wrap-up).
Background section - Provide a brief overview of client: what they do, their market position, relevant recent news (you may simulate this based on available info).
Participants insights - Add relevant professional insights about each participant based on their role (e.g., what might matter to a Procurement Manager vs. a Medical Director).
Preparation tips - Suggest specific preparation steps to help the sales executive enter the meeting with confidence. Include key messaging tips, likely objections, and tailored value propositions.
Outcome goals - Add clear objectives to aim for in the meeting (e.g., securing a pilot project, scheduling follow-up with technical team)
The output should be well-formatted and suitable for internal preparation and sharing with other stakeholders on the sales team.
"""
