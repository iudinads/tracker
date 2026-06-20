import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { TaskCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const data = readData();
  const category: TaskCategory = {
    id: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  data.taskCategories.push(category);
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
  data.taskCategories = data.taskCategories.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.categoryId !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
