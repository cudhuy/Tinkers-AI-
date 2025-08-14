import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// Get agenda by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agendaId = params.id;
  try {
    // Read agenda from file - always use the numeric ID as the filename
    const agendaPath = path.join(
      process.cwd(),
      "src/data/mocked/agendas",
      `${agendaId}.json`
    );
    
    const agenda = await fs.readFile(agendaPath, "utf8");
    return NextResponse.json(JSON.parse(agenda));
  } catch (error) {
    console.error(`Error fetching agenda ${agendaId}:`, error);
    return NextResponse.json(
      { error: "Agenda not found" },
      { status: 404 }
    );
  }
}

// Update agenda
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agendaId = params.id;
  const body = await request.json();

  try {
    // Check if agenda exists - always use the numeric ID as the filename
    const agendaPath = path.join(
      process.cwd(),
      "src/data/mocked/agendas",
      `${agendaId}.json`
    );
    
    // Read the existing agenda
    const existingAgendaRaw = await fs.readFile(agendaPath, "utf8");
    const existingAgenda = JSON.parse(existingAgendaRaw);
    
    // Update fields: title, preparation_tips, checklist, time_plan, participant_insights
    const updatedAgenda = {
      ...existingAgenda,
      title: body.title !== undefined ? body.title : existingAgenda.title,
      preparation_tips: body.preparation_tips !== undefined ? body.preparation_tips : existingAgenda.preparation_tips,
      checklist: body.checklist !== undefined ? body.checklist : existingAgenda.checklist,
      time_plan: body.time_plan !== undefined ? body.time_plan : existingAgenda.time_plan,
      participant_insights: body.participant_insights !== undefined ? body.participant_insights : existingAgenda.participant_insights
    };
    
    // Write the updated agenda back to the file
    await fs.writeFile(agendaPath, JSON.stringify(updatedAgenda, null, 2));
    
    return NextResponse.json(updatedAgenda);
  } catch (error) {
    console.error(`Error updating agenda ${agendaId}:`, error);
    return NextResponse.json(
      { error: "Failed to update agenda" },
      { status: 500 }
    );
  }
} 