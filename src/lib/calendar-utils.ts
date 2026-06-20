import { CalendarEvent, CalendarEventCategory } from "@/lib/types";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  return new Date(key + "T00:00:00");
}

export function eventOnDate(event: CalendarEvent, dateKey: string): boolean {
  return dateKey >= event.startDate && dateKey <= event.endDate;
}

export function eventsForDate(events: CalendarEvent[], dateKey: string): CalendarEvent[] {
  return events.filter((e) => eventOnDate(e, dateKey));
}

export function categoriesForDate(
  events: CalendarEvent[],
  dateKey: string
): CalendarEventCategory[] {
  const seen = new Set<CalendarEventCategory>();
  const result: CalendarEventCategory[] = [];
  for (const event of events) {
    if (eventOnDate(event, dateKey) && !seen.has(event.category)) {
      seen.add(event.category);
      result.push(event.category);
    }
  }
  return result;
}

export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

export function formatDayLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
