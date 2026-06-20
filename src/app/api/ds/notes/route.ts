import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { DSNote } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const note: DSNote = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  data.dsNotes.push(note);
  writeData(data);
  return NextResponse.json(note);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, title, content } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.dsNotes.findIndex((n) => n.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = data.dsNotes[idx];
  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content.trim();

  writeData(data);
  return NextResponse.json(note);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.dsNotes = data.dsNotes.filter((n) => n.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
