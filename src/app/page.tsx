"use client";

import { useState } from "react";
import { DataProvider } from "@/lib/data-context";
import { TasksSection } from "@/components/tasks/tasks-section";
import { WorkoutsSection } from "@/components/workouts/workouts-section";

type Tab = "tasks" | "workouts";

function AppContent() {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Трекер</h1>
          <nav className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1">
            <button
              onClick={() => setTab("tasks")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === "tasks"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Дела
            </button>
            <button
              onClick={() => setTab("workouts")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === "workouts"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Тренировки
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {tab === "tasks" ? <TasksSection /> : <WorkoutsSection />}
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
