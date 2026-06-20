import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { Task, TaskStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { categoryId, title, scheduledDate, deadline, status } = body;

  if (!categoryId || !title?.trim()) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    categoryId,
    title: title.trim(),
    scheduledDate: scheduledDate || undefined,
    deadline: deadline || undefined,
    status: (status as TaskStatus) || "backlog",
    createdAt: now,
    updatedAt: now,
  };
  if ((status as TaskStatus) === "cancelled") {
    return NextResponse.json({ error: "Use delete for cancelled tasks" }, { status: 400 });
  }
  data.tasks.push(task);
  writeData(data);
  return NextResponse.json(task);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, title, scheduledDate, deadline, status, categoryId } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const task = data.tasks[idx];
  if (status === "cancelled") {
    data.tasks = data.tasks.filter((t) => t.id !== id);
    writeData(data);
    return NextResponse.json({ ok: true, deleted: true });
  }

  if (title !== undefined) task.title = title.trim();
  if (categoryId !== undefined) task.categoryId = categoryId;
  if (scheduledDate !== undefined) task.scheduledDate = scheduledDate || undefined;
  if (deadline !== undefined) task.deadline = deadline || undefined;
  if (status !== undefined) task.status = status;
  task.updatedAt = new Date().toISOString();

  writeData(data);
  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
