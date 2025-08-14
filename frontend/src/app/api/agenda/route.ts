import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { title, datetime, content } = await request.json();
    
    if (!title || !datetime || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Path to the agendas directory
    const agendaDir = path.join(process.cwd(), 'src/data/mocked/agendas');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(agendaDir, { recursive: true });
      
      // Find the highest existing numeric ID
      const files = await fs.readdir(agendaDir);
      const numericIds = files
        .filter(file => /^\d+\.json$/.test(file))
        .map(file => parseInt(file.split('.')[0]))
        .filter(id => !isNaN(id));
      
      const highestId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      const newId = highestId + 1;
      
      // Use the numeric ID as both the filename and the ID in the JSON
      const filename = `${newId}.json`;
      
      // Create the agenda object with the numeric ID as a string
      const agenda = {
        id: newId.toString(), // Use the numeric ID as a string
        datetime,
        title,
        content
      };
      
      // Write the agenda to a file
      await fs.writeFile(
        path.join(agendaDir, filename),
        JSON.stringify(agenda, null, 2)
      );
      
      return NextResponse.json({ 
        success: true, 
        id: newId.toString(),
        filename
      });
    } catch (error) {
      console.error('Error accessing or creating directory:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error saving agenda:', error);
    return NextResponse.json(
      { error: 'Failed to save agenda: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 