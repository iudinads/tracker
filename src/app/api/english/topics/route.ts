import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { EnglishTopic } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const data = readData();
  const topic: EnglishTopic = {
    id: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  data.englishTopics.push(topic);
  writeData(data);
  return NextResponse.json(topic);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.englishTopics = data.englishTopics.filter((t) => t.id !== id);
  data.englishWords = data.englishWords.filter((w) => w.topicId !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
