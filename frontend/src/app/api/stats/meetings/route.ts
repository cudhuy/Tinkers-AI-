import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "src/data/mocked/stats/monthly-meetings.json");
    const content = await fs.readFile(dataPath, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error fetching meetings stats:", error);
    
    // If file doesn't exist, return sample data
    return NextResponse.json([
      { month: "Jan", meetings: 12 },
      { month: "Feb", meetings: 15 },
      { month: "Mar", meetings: 18 },
      { month: "Apr", meetings: 13 },
      { month: "May", meetings: 22 },
      { month: "Jun", meetings: 19 },
      { month: "Jul", meetings: 25 },
      { month: "Aug", meetings: 16 },
      { month: "Sep", meetings: 20 },
      { month: "Oct", meetings: 23 },
      { month: "Nov", meetings: 0 },
      { month: "Dec", meetings: 0 }
    ]);
  }
} 