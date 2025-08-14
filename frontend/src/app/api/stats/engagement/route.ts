import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "src/data/mocked/stats/user-engagement.json");
    const content = await fs.readFile(dataPath, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error fetching engagement stats:", error);
    
    // If file doesn't exist, return sample data
    return NextResponse.json([
      { date: "2023-10-01", engagement: 45 },
      { date: "2023-10-02", engagement: 52 },
      { date: "2023-10-03", engagement: 38 },
      { date: "2023-10-04", engagement: 62 },
      { date: "2023-10-05", engagement: 57 },
      { date: "2023-10-06", engagement: 43 },
      { date: "2023-10-07", engagement: 25 }
    ]);
  }
} 