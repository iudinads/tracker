import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "@/lib/storage";
import { CalendarEvent, CalendarEventCategory } from "@/lib/types";

const VALID_CATEGORIES: CalendarEventCategory[] = [
  "party",
  "workout",
  "work",
  "personal",
  "other",
];

function validateEventBody(body: {
  title?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}): string | null {
  if (!body.title?.trim()) return "Title required";
  if (!body.startDate || !body.endDate) return "Dates required";
  if (body.endDate < body.startDate) return "End date must be after start date";
  if (!body.category || !VALID_CATEGORIES.includes(body.category as CalendarEventCategory)) {
    return "Invalid category";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const error = validateEventBody(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const data = readData();
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: uuidv4(),
    title: body.title.trim(),
    startDate: body.startDate,
    endDate: body.endDate,
    category: body.category as CalendarEventCategory,
    createdAt: now,
    updatedAt: now,
  };
  data.calendarEvents.push(event);
  writeData(data);
  return NextResponse.json(event);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const error = validateEventBody(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const data = readData();
  const idx = data.calendarEvents.findIndex((e) => e.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const event = data.calendarEvents[idx];
  event.title = body.title.trim();
  event.startDate = body.startDate;
  event.endDate = body.endDate;
  event.category = body.category as CalendarEventCategory;
  event.updatedAt = new Date().toISOString();

  writeData(data);
  return NextResponse.json(event);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const data = readData();
  data.calendarEvents = data.calendarEvents.filter((e) => e.id !== id);
  writeData(data);
  return NextResponse.json({ ok: true });
}
