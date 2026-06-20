import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { Exercise, Workout } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { categoryId, date, durationMinutes, avgHeartRate, calories, exercises } = body;

  if (!categoryId || !date) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const workout: Workout = {
    id: uuidv4(),
    categoryId,
    date,
    durationMinutes: durationMinutes || 0,
    avgHeartRate: avgHeartRate || undefined,
    calories: calories || undefined,
    exercises: (exercises || []).map((ex: Exercise) => ({
      ...ex,
      id: ex.id || uuidv4(),
    })),
    createdAt: new Date().toISOString(),
  };
  data.workouts.push(workout);
  writeData(data);
  return NextResponse.json(workout);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, date, durationMinutes, avgHeartRate, calories, exercises } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.workouts.findIndex((w) => w.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const workout = data.workouts[idx];
  if (date !== undefined) workout.date = date;
  if (durationMinutes !== undefined) workout.durationMinutes = durationMinutes;
  if (avgHeartRate !== undefined) workout.avgHeartRate = avgHeartRate || undefined;
  if (calories !== undefined) workout.calories = calories || undefined;
  if (exercises !== undefined) {
    workout.exercises = exercises.map((ex: Exercise) => ({
      ...ex,
      id: ex.id || uuidv4(),
    }));
  }

  writeData(data);
  return NextResponse.json(workout);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.workouts = data.workouts.filter((w) => w.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
