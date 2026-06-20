import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { GrammarRule } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const rule: GrammarRule = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  data.grammarRules.push(rule);
  writeData(data);
  return NextResponse.json(rule);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, title, content } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.grammarRules.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rule = data.grammarRules[idx];
  if (title !== undefined) rule.title = title.trim();
  if (content !== undefined) rule.content = content.trim();

  writeData(data);
  return NextResponse.json(rule);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.grammarRules = data.grammarRules.filter((r) => r.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
