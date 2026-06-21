"use client";

import { useCallback, useRef, useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import {
  categoriesForDate,
  eventsForDate,
  formatDayLabel,
  formatMonthYear,
  getMonthGrid,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import {
  CALENDAR_CATEGORIES,
  CalendarEvent,
  CalendarEventCategory,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { formatDate } from "@/components/ui/badge";

const TODAY = new Date();

const categoryMap = Object.fromEntries(
  CALENDAR_CATEGORIES.map((c) => [c.value, c])
) as Record<CalendarEventCategory, (typeof CALENDAR_CATEGORIES)[number]>;

const categoryOptions = CALENDAR_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

export function CalendarSection({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { data, loading, refresh } = useData();
  const [viewYear, setViewYear] = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    category: "other" as CalendarEventCategory,
    allDay: true,
    startTime: "09:00",
    endTime: "10:00",
  });

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const wheelAccum = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const todayKey = toDateKey(TODAY);
  const monthGrid = getMonthGrid(viewYear, viewMonth);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  const finishSwipe = useCallback(
    (delta: number) => {
      const threshold = 50;
      setIsAnimating(true);
      setSwipeOffset(0);
      if (delta > threshold) goToPrevMonth();
      else if (delta < -threshold) goToNextMonth();
      setTimeout(() => setIsAnimating(false), 200);
    },
    [goToPrevMonth, goToNextMonth]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setIsAnimating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(touchDeltaX.current);
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    finishSwipe(touchDeltaX.current);
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    wheelAccum.current += e.deltaX;
    if (wheelAccum.current > 80) {
      wheelAccum.current = 0;
      goToNextMonth();
    } else if (wheelAccum.current < -80) {
      wheelAccum.current = 0;
      goToPrevMonth();
    }
  };

  const openNewEvent = (dateKey?: string) => {
    const start = dateKey || selectedDate || todayKey;
    setEditingEvent(null);
    setEventForm({
      title: "",
      startDate: start,
      endDate: start,
      category: "other",
      allDay: true,
      startTime: "09:00",
      endTime: "10:00",
    });
    setShowEventModal(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    const isAllDay = event.allDay !== false;
    setEventForm({
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      category: event.category,
      allDay: isAllDay,
      startTime: event.startTime || "09:00",
      endTime: event.endTime || "10:00",
    });
    setShowEventModal(true);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay !== false || !event.startTime) return null;
    if (event.endTime && event.endTime !== event.startTime) {
      return `${event.startTime} — ${event.endTime}`;
    }
    return event.startTime;
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) return;
    if (eventForm.endDate < eventForm.startDate) return;

    if (editingEvent) {
      await apiPut("/api/calendar/events", {
        id: editingEvent.id,
        title: eventForm.title,
        startDate: eventForm.startDate,
        endDate: eventForm.endDate,
        category: eventForm.category,
        allDay: eventForm.allDay,
        startTime: eventForm.allDay ? undefined : eventForm.startTime,
        endTime: eventForm.allDay ? undefined : eventForm.endTime,
      });
    } else {
      await apiPost("/api/calendar/events", {
        title: eventForm.title,
        startDate: eventForm.startDate,
        endDate: eventForm.endDate,
        category: eventForm.category,
        allDay: eventForm.allDay,
        startTime: eventForm.allDay ? undefined : eventForm.startTime,
        endTime: eventForm.allDay ? undefined : eventForm.endTime,
      });
    }
    setShowEventModal(false);
    await refresh();
  };

  const handleDeleteFromModal = async () => {
    if (!editingEvent) return;
    if (!confirm("Удалить событие?")) return;
    await apiDelete(`/api/calendar/events?id=${editingEvent.id}`);
    setShowEventModal(false);
    await refresh();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Удалить событие?")) return;
    await apiDelete(`/api/calendar/events?id=${id}`);
    await refresh();
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey));
  };

  const stopHeaderClick = (e: React.MouseEvent) => e.stopPropagation();

  const handleHeaderClick = () => {
    onToggle?.();
  };

  const selectedEvents = selectedDate
    ? eventsForDate(data.calendarEvents, selectedDate)
    : [];

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 text-center text-sm text-neutral-400">
        Загрузка календаря...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
      <div
        onClick={handleHeaderClick}
        className={`flex items-center justify-between px-4 pt-4 ${collapsed ? "pb-3 cursor-pointer" : "pb-2 cursor-pointer"} hover:bg-neutral-50/80 transition-colors`}
      >
        <button
          onClick={(e) => {
            stopHeaderClick(e);
            goToPrevMonth();
          }}
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold capitalize">
          {formatMonthYear(viewYear, viewMonth)}
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              stopHeaderClick(e);
              goToNextMonth();
            }}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
            aria-label="Следующий месяц"
          >
            ›
          </button>
          {onToggle && (
            <button
              onClick={(e) => {
                stopHeaderClick(e);
                onToggle();
              }}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
              aria-label={collapsed ? "Развернуть календарь" : "Свернуть календарь"}
            >
              <span
                className={`block text-xs transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
              >
                ˄
              </span>
            </button>
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden min-h-0">
      <div
        className="px-3 pb-3 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          transform: swipeOffset ? `translateX(${swipeOffset * 0.3}px)` : undefined,
          transition: isAnimating ? "transform 0.2s ease" : undefined,
        }}
      >
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-medium text-neutral-400 uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {monthGrid.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const dateKey = toDateKey(date);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const dayEvents = eventsForDate(data.calendarEvents, dateKey);
            const dayCategories = categoriesForDate(data.calendarEvents, dateKey);
            const hasEvents = dayEvents.length > 0;
            const primaryCategory = dayCategories[0];
            const ringClass = primaryCategory
              ? categoryMap[primaryCategory].ring
              : "";

            return (
              <button
                key={dateKey}
                onClick={() => handleDayClick(dateKey)}
                className="flex flex-col items-center justify-start aspect-square p-0.5"
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition",
                    isToday && !isSelected
                      ? "bg-neutral-900 text-white"
                      : isSelected
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-700",
                    hasEvents && !isToday ? `ring-2 ${ringClass}` : "",
                    hasEvents && isToday ? `ring-2 ring-offset-1 ${ringClass}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {date.getDate()}
                </span>

                {dayCategories.length > 0 && (
                  <span className="mt-0.5 flex gap-0.5 justify-center">
                    {dayCategories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className={`h-1 w-1 rounded-full ${categoryMap[cat].dot}`}
                      />
                    ))}
                  </span>
                )}

              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="border-t border-neutral-100 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-neutral-700 capitalize">
              {formatDayLabel(selectedDate)}
            </h3>
            <Button size="sm" onClick={() => openNewEvent(selectedDate)}>
              + Событие
            </Button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">Нет событий</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((event) => {
                const cat = categoryMap[event.category];
                const isRange = event.startDate !== event.endDate;
                const timeLabel = formatEventTime(event);
                return (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 p-3 hover:border-neutral-200 transition"
                  >
                    <button
                      onClick={() => openEditEvent(event)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.badge}`}
                        >
                          {cat.label}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-neutral-900">{event.title}</p>
                      {timeLabel && (
                        <p className="mt-0.5 text-xs text-neutral-500">{timeLabel}</p>
                      )}
                      {isRange && (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {formatDate(event.startDate)} — {formatDate(event.endDate)}
                        </p>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
                    >
                      Удалить
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
        </div>
      </div>

      <Modal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        title={editingEvent ? "Редактировать событие" : "Новое событие"}
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            placeholder="Название события"
            autoFocus
          />
          <Input
            label="Дата начала"
            type="date"
            value={eventForm.startDate}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                startDate: e.target.value,
                endDate:
                  eventForm.endDate < e.target.value
                    ? e.target.value
                    : eventForm.endDate,
              })
            }
          />
          <Input
            label="Дата конца"
            type="date"
            value={eventForm.endDate}
            min={eventForm.startDate}
            onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
          />
          <Select
            label="Категория"
            options={categoryOptions}
            value={eventForm.category}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                category: e.target.value as CalendarEventCategory,
              })
            }
          />
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={eventForm.allDay}
              onChange={(e) =>
                setEventForm({ ...eventForm, allDay: e.target.checked })
              }
              className="rounded border-neutral-300"
            />
            Весь день
          </label>
          {!eventForm.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Время начала"
                type="time"
                value={eventForm.startTime}
                onChange={(e) =>
                  setEventForm({ ...eventForm, startTime: e.target.value })
                }
              />
              <Input
                label="Время конца"
                type="time"
                value={eventForm.endTime}
                onChange={(e) =>
                  setEventForm({ ...eventForm, endTime: e.target.value })
                }
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {editingEvent && (
              <Button variant="danger" onClick={handleDeleteFromModal}>
                Удалить
              </Button>
            )}
            <Button className="flex-1" onClick={handleSaveEvent}>
              {editingEvent ? "Сохранить" : "Добавить"}
            </Button>
            <Button variant="secondary" onClick={() => setShowEventModal(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
