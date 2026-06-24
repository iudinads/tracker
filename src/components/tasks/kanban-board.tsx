"use client";

import { useState } from "react";
import { apiDelete, apiPut } from "@/lib/data-context";
import { Task, TaskStatus } from "@/lib/types";
import {
  KANBAN_ACTIVE_STATUSES,
  isDeadlineOverdue,
  isDeadlineSoon,
  sortTasksByDeadline,
} from "@/lib/task-sort";
import { formatDate } from "@/components/ui/badge";

interface KanbanBoardProps {
  tasks: Task[];
  categoryNames: Record<string, string>;
  onEditTask: (task: Task) => void;
  onRefresh: () => Promise<void>;
  expandedTaskId?: string | null;
  onToggleExpand?: (id: string) => void;
}

const columnStyles: Record<TaskStatus, string> = {
  backlog: "bg-neutral-100 border-neutral-200",
  in_progress: "bg-amber-50 border-amber-200",
  done: "bg-emerald-50 border-emerald-200",
  cancelled: "",
};

export function KanbanBoard({
  tasks,
  categoryNames,
  onEditTask,
  onRefresh,
  expandedTaskId = null,
  onToggleExpand,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const boardTasks = tasks.filter((t) => t.status !== "cancelled" && t.status !== "done");

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setUpdatingId(taskId);
    try {
      if (newStatus === "cancelled") {
        await apiDelete(`/api/tasks?id=${taskId}`);
      } else {
        await apiPut("/api/tasks", { id: taskId, status: newStatus });
      }
      await onRefresh();
    } finally {
      setUpdatingId(null);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

  const moveTask = async (task: Task, direction: "prev" | "next") => {
    const order: TaskStatus[] = ["backlog", "in_progress", "done"];
    const idx = order.indexOf(task.status as TaskStatus);
    if (idx === -1) return;

    const newIdx = direction === "prev" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    await handleDrop(task.id, order[newIdx]);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {KANBAN_ACTIVE_STATUSES.map((column) => {
        const columnTasks = sortTasksByDeadline(
          boardTasks.filter((t) => t.status === column.value)
        );

        return (
          <div
            key={column.value}
            className={`flex min-w-[260px] flex-1 flex-col rounded-xl border ${columnStyles[column.value]} ${
              dropTarget === column.value ? "ring-2 ring-neutral-400 ring-offset-2" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(column.value);
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("taskId");
              if (taskId) handleDrop(taskId, column.value);
            }}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-3 py-2.5">
              <h4 className="text-sm font-semibold text-neutral-700">{column.label}</h4>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-neutral-500">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
              {columnTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">Пусто</p>
              ) : (
                columnTasks.map((task) => {
                  const isExpanded = expandedTaskId === task.id;

                  return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id);
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    className={`group rounded-lg border border-white/80 bg-white p-3 shadow-sm transition ${
                      draggingId === task.id ? "opacity-50" : ""
                    } ${updatingId === task.id ? "opacity-60 pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => onToggleExpand?.(task.id)}
                    >
                      {categoryNames[task.categoryId] && (
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                          {categoryNames[task.categoryId]}
                        </span>
                      )}
                      <p className="text-sm font-medium text-neutral-900 leading-snug">
                        {task.title}
                        {task.comment && !isExpanded && (
                          <span className="ml-1 text-[10px] font-normal text-neutral-400">
                            · комментарий
                          </span>
                        )}
                      </p>
                      {(task.deadline || task.scheduledDate) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {task.deadline && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 ${
                                isDeadlineOverdue(task.deadline)
                                  ? "bg-red-100 text-red-700"
                                  : isDeadlineSoon(task.deadline)
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              до {formatDate(task.deadline)}
                            </span>
                          )}
                          {task.scheduledDate && (
                            <span className="text-neutral-500">
                              {formatDate(task.scheduledDate)}
                            </span>
                          )}
                        </div>
                      )}
                      {isExpanded && task.comment && (
                        <p className="mt-2 border-t border-neutral-100 pt-2 text-xs text-neutral-600 whitespace-pre-wrap">
                          {task.comment}
                        </p>
                      )}
                    </button>

                    <div className="mt-2 flex gap-1">
                      {isExpanded && (
                        <button
                          onClick={() => onEditTask(task)}
                          className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                        >
                          Изменить
                        </button>
                      )}
                      {column.value !== "backlog" && (
                        <button
                          onClick={() => moveTask(task, "prev")}
                          className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                          title="Переместить назад"
                        >
                          ←
                        </button>
                      )}
                      {column.value !== "in_progress" && (
                        <button
                          onClick={() => moveTask(task, "next")}
                          className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                          title="Переместить вперёд"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
