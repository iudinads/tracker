import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { WeightEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, weight } = body;

  if (!date || weight === undefined || weight === null) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const entry: WeightEntry = {
    id: uuidv4(),
    date,
    weight: Number(weight),
    createdAt: new Date().toISOString(),
  };

  data.weightEntries.push(entry);
  writeData(data);
  return NextResponse.json(entry);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.weightEntries = data.weightEntries.filter((e) => e.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
