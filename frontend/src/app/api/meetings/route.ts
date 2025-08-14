import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { timestamp, data } = await request.json();
    
    // Ensure directory exists
    const meetingsDir = path.join(process.cwd(), 'src/data/mocked/meetings');
    try {
      await fs.promises.access(meetingsDir);
    } catch (error) {
      await fs.promises.mkdir(meetingsDir, { recursive: true });
    }
    
    // Write the meeting data to a file named with the timestamp
    const filePath = path.join(meetingsDir, `${timestamp}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, message: 'Meeting data saved successfully' });
  } catch (error) {
    console.error('Error saving meeting data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save meeting data' },
      { status: 500 }
    );
  }
} 