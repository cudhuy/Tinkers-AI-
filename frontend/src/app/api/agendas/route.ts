import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// Get all agendas
export async function GET() {
  try {
    const agendaDir = path.join(process.cwd(), "src/data/mocked/agendas");
    
    try {
      // List all files in the agendas directory
      const files = await fs.readdir(agendaDir);
      const agendaFiles = files.filter(file => /^\d+\.json$/.test(file));
      
      // Read each agenda file
      const agendas = await Promise.all(
        agendaFiles.map(async (file) => {
          const content = await fs.readFile(path.join(agendaDir, file), "utf8");
          return JSON.parse(content);
        })
      );
      
      // Sort agendas by datetime (newest first)
      const sortedAgendas = agendas.sort((a, b) => 
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );
      
      return NextResponse.json(sortedAgendas);
    } catch (error) {
      console.error("Error reading agendas directory:", error);
      // Return empty array if directory doesn't exist or can't be read
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching agendas:", error);
    return NextResponse.json(
      { error: "Failed to fetch agendas" },
      { status: 500 }
    );
  }
} 