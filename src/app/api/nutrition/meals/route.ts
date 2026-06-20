import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { MealEntry, MealType } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, mealType, name, calories, protein, fat, carbs } = body;

  if (!date || !mealType || !name?.trim()) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const entry: MealEntry = {
    id: uuidv4(),
    date,
    mealType: mealType as MealType,
    name: name.trim(),
    calories: Number(calories) || 0,
    protein: Number(protein) || 0,
    fat: Number(fat) || 0,
    carbs: Number(carbs) || 0,
    createdAt: new Date().toISOString(),
  };

  data.mealEntries.push(entry);
  writeData(data);
  return NextResponse.json(entry);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, calories, protein, fat, carbs, mealType } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.mealEntries.findIndex((m) => m.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entry = data.mealEntries[idx];
  if (name !== undefined) entry.name = name.trim();
  if (calories !== undefined) entry.calories = Number(calories) || 0;
  if (protein !== undefined) entry.protein = Number(protein) || 0;
  if (fat !== undefined) entry.fat = Number(fat) || 0;
  if (carbs !== undefined) entry.carbs = Number(carbs) || 0;
  if (mealType !== undefined) entry.mealType = mealType;

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
  data.mealEntries = data.mealEntries.filter((m) => m.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
