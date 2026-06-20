import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { WorkoutCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const data = readData();
  const category: WorkoutCategory = {
    id: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  data.workoutCategories.push(category);
  writeData(data);
  return NextResponse.json(category);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.workoutCategories = data.workoutCategories.filter((c) => c.id !== id);
  data.workouts = data.workouts.filter((w) => w.categoryId !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
