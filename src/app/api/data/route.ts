import { NextResponse } from "next/server";
import { readData } from "@/lib/storage";

export async function GET() {
  const data = readData();
  return NextResponse.json(data);
}
