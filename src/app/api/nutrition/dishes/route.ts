import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { SavedDish } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, calories, protein, fat, carbs } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const data = readData();
  const existing = data.savedDishes.find(
    (d) => d.name.toLowerCase() === name.trim().toLowerCase()
  );

  if (existing) {
    existing.calories = Number(calories) || 0;
    existing.protein = Number(protein) || 0;
    existing.fat = Number(fat) || 0;
    existing.carbs = Number(carbs) || 0;
    writeData(data);
    return NextResponse.json(existing);
  }

  const dish: SavedDish = {
    id: uuidv4(),
    name: name.trim(),
    calories: Number(calories) || 0,
    protein: Number(protein) || 0,
    fat: Number(fat) || 0,
    carbs: Number(carbs) || 0,
    createdAt: new Date().toISOString(),
  };

  data.savedDishes.push(dish);
  writeData(data);
  return NextResponse.json(dish);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.savedDishes = data.savedDishes.filter((d) => d.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
