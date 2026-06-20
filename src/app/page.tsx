"use client";

import { useEffect, useRef, useState } from "react";
import { DataProvider } from "@/lib/data-context";
import { CalendarSection } from "@/components/calendar/calendar-section";
import { TasksSection } from "@/components/tasks/tasks-section";
import { WorkoutsSection } from "@/components/workouts/workouts-section";
import { NutritionSection } from "@/components/nutrition/nutrition-section";
import { EnglishSection } from "@/components/english/english-section";
import { DataScienceSection } from "@/components/datascience/datascience-section";

type Tab = "tasks" | "workouts" | "nutrition" | "english" | "datascience";

const tabs: { id: Tab; label: string }[] = [
  { id: "tasks", label: "Дела" },
  { id: "workouts", label: "Тренировки" },
  { id: "nutrition", label: "Питание" },
  { id: "english", label: "Английский" },
  { id: "datascience", label: "Data Science" },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current && y > 32) {
        setCalendarCollapsed(true);
      }
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Трекер</h1>
          <div className="mt-4">
            <CalendarSection
              collapsed={calendarCollapsed}
              onToggle={() => setCalendarCollapsed((c) => !c)}
            />
          </div>
          <nav className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {tab === "tasks" && <TasksSection />}
        {tab === "workouts" && <WorkoutsSection />}
        {tab === "nutrition" && <NutritionSection />}
        {tab === "english" && <EnglishSection />}
        {tab === "datascience" && <DataScienceSection />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
