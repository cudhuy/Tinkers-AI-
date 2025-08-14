import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const agendaData = await request.json();
    
    if (!agendaData) {
      return NextResponse.json(
        { error: 'Missing agenda data' },
        { status: 400 }
      );
    }
    
    // Generate timestamp for ID and filename
    const timestamp = Date.now().toString();
    
    // Transform time_plan into the requested format
    const formattedTimePlan = agendaData.time_plan.map(tp => {
      const timeSlot = `${tp.start} - ${tp.end}`;
      return { [timeSlot]: tp.content };
    });
    
    // Log the transformed time_plan to verify structure
    console.log('Formatted time plan:', JSON.stringify(formattedTimePlan, null, 2));
    
    // Format the agenda data according to the specified structure
    const formattedAgenda = {
      id: timestamp,
      datetime: new Date().toISOString(),
      title: agendaData.title || "Meeting Agenda",
      checklist: agendaData.checklist,
      preparation_tips: agendaData.preparation_tips,
      time_plan: formattedTimePlan,
      participant_insights: agendaData.participants_insights,
      attachments: agendaData.attachments
    };
    
    // Path to the agendas directory
    const agendaDir = path.join(process.cwd(), 'src/data/mocked/agendas');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(agendaDir, { recursive: true });
      
      // Use the timestamp as the filename
      const filename = `${timestamp}.json`;
      
      // Write the agenda to a file
      await fs.writeFile(
        path.join(agendaDir, filename),
        JSON.stringify(formattedAgenda, null, 2)
      );
      
      return NextResponse.json({ 
        success: true, 
        id: timestamp,
        filename
      });
    } catch (error) {
      console.error('Error accessing or creating directory:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error saving accepted agenda:', error);
    return NextResponse.json(
      { error: 'Failed to save agenda: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 