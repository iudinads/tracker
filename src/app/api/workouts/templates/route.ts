import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { WorkoutTemplate, WorkoutTemplateExercise } from "@/lib/types";

function validateTemplate(body: {
  name?: string;
  categoryId?: string;
  exercises?: WorkoutTemplateExercise[];
}): string | null {
  if (!body.name?.trim()) return "Name required";
  if (!body.categoryId) return "Category required";
  if (!body.exercises || body.exercises.length === 0) return "Exercises required";
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const error = validateTemplate(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const data = readData();
  const template: WorkoutTemplate = {
    id: uuidv4(),
    name: body.name.trim(),
    categoryId: body.categoryId,
    exercises: (body.exercises || []).map((ex: WorkoutTemplateExercise) => ({
      name: ex.name.trim(),
      setsCount: Math.max(1, Number(ex.setsCount) || 1),
      comment: ex.comment?.trim() || undefined,
    })),
    createdAt: new Date().toISOString(),
  };
  data.workoutTemplates.push(template);
  writeData(data);
  return NextResponse.json(template);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const error = validateTemplate(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const data = readData();
  const idx = data.workoutTemplates.findIndex((t) => t.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = data.workoutTemplates[idx];
  template.name = body.name.trim();
  template.categoryId = body.categoryId;
  template.exercises = (body.exercises || []).map((ex: WorkoutTemplateExercise) => ({
    name: ex.name.trim(),
    setsCount: Math.max(1, Number(ex.setsCount) || 1),
    comment: ex.comment?.trim() || undefined,
  }));

  writeData(data);
  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.workoutTemplates = data.workoutTemplates.filter((t) => t.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
