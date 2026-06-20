import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/storage";
import { NutritionGoals } from "@/lib/types";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { calories, protein, fat, carbs } = body;

  const data = readData();
  const goals: NutritionGoals = {
    calories: Number(calories) || 0,
    protein: Number(protein) || 0,
    fat: Number(fat) || 0,
    carbs: Number(carbs) || 0,
  };

  data.nutritionGoals = goals;
  writeData(data);
  return NextResponse.json(goals);
}
