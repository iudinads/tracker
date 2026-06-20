import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { EnglishWord } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, english, russian, phrases } = body;

  if (!topicId || !english?.trim() || !russian?.trim()) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const data = readData();
  const word: EnglishWord = {
    id: uuidv4(),
    topicId,
    english: english.trim(),
    russian: russian.trim(),
    phrases: phrases?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  data.englishWords.push(word);
  writeData(data);
  return NextResponse.json(word);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, english, russian, phrases, topicId } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  const idx = data.englishWords.findIndex((w) => w.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const word = data.englishWords[idx];
  if (english !== undefined) word.english = english.trim();
  if (russian !== undefined) word.russian = russian.trim();
  if (phrases !== undefined) word.phrases = phrases?.trim() || undefined;
  if (topicId !== undefined) word.topicId = topicId;

  writeData(data);
  return NextResponse.json(word);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.englishWords = data.englishWords.filter((w) => w.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
