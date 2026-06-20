"use client";

import { useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { TASK_STATUSES, Task, TaskCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge, formatDate } from "@/components/ui/badge";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { sortTasksByDeadline } from "@/lib/task-sort";

type TaskView = "list" | "kanban";

export function TasksSection() {
  const { data, loading, refresh } = useData();
  const [view, setView] = useState<TaskView>("list");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    scheduledDate: "",
    deadline: "",
    status: "backlog" as Task["status"],
    categoryId: "",
  });

  const categories = data.taskCategories;
  const activeCategory = selectedCategory || categories[0]?.id || null;
  const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const allBoardTasks = sortTasksByDeadline(
    data.tasks.filter((t) => t.status !== "cancelled")
  );
  const categoryTasks = sortTasksByDeadline(
    data.tasks.filter((t) => t.categoryId === activeCategory && t.status !== "cancelled")
  );

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: "",
      scheduledDate: "",
      deadline: "",
      status: "backlog",
      categoryId: activeCategory || categories[0]?.id || "",
    });
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      scheduledDate: task.scheduledDate || "",
      deadline: task.deadline || "",
      status: task.status,
      categoryId: task.categoryId,
    });
    setShowTaskModal(true);
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    await apiPost<TaskCategory>("/api/tasks/categories", { name: categoryName });
    setCategoryName("");
    setShowCategoryModal(false);
    await refresh();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Удалить раздел и все дела в нём?")) return;
    await apiDelete(`/api/tasks/categories?id=${id}`);
    if (selectedCategory === id) setSelectedCategory(null);
    await refresh();
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim() || !taskForm.categoryId) return;
    if (editingTask) {
      if (taskForm.status === "cancelled") {
        await apiDelete(`/api/tasks?id=${editingTask.id}`);
      } else {
        await apiPut("/api/tasks", {
          id: editingTask.id,
          categoryId: taskForm.categoryId,
          title: taskForm.title,
          scheduledDate: taskForm.scheduledDate,
          deadline: taskForm.deadline,
          status: taskForm.status,
        });
      }
    } else {
      if (taskForm.status === "cancelled") return;
      await apiPost("/api/tasks", {
        categoryId: taskForm.categoryId,
        title: taskForm.title,
        scheduledDate: taskForm.scheduledDate,
        deadline: taskForm.deadline,
        status: taskForm.status,
      });
    }
    setShowTaskModal(false);
    await refresh();
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Удалить дело?")) return;
    await apiDelete(`/api/tasks?id=${id}`);
    await refresh();
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Дела</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-neutral-100 p-0.5">
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === "list"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Список
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === "kanban"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Доска
            </button>
          </div>
          {categories.length > 0 && (
            <Button size="sm" onClick={openNewTask}>
              + Дело
            </Button>
          )}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">Создайте первый раздел</p>
          <p className="mt-1 text-sm text-neutral-400">Например: «По работе», «Дом», «Учёба»</p>
          <Button className="mt-4" size="sm" onClick={() => setShowCategoryModal(true)}>
            Создать раздел
          </Button>
        </div>
      ) : view === "kanban" ? (
        allBoardTasks.length === 0 ? (
          <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
            Нет дел для доски
          </div>
        ) : (
          <KanbanBoard
            tasks={data.tasks}
            categoryNames={categoryNames}
            onEditTask={openEditTask}
            onRefresh={refresh}
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-500">Разделы</h3>
            <Button size="sm" variant="secondary" onClick={() => setShowCategoryModal(true)}>
              + Раздел
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeCategory === cat.id
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="rounded-full p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                  title="Удалить раздел"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {categoryTasks.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
              Нет дел — добавьте первое
            </div>
          ) : (
            <div className="space-y-2">
              {categoryTasks.map((task) => (
                <div
                  key={task.id}
                  className="group rounded-xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => openEditTask(task)}>
                      <p
                        className={`font-medium ${task.status === "cancelled" ? "line-through text-neutral-400" : ""}`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <StatusBadge status={task.status} />
                        {task.scheduledDate && (
                          <span>{formatDate(task.scheduledDate)}</span>
                        )}
                        {task.deadline && (
                          <span>до {formatDate(task.deadline)}</span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "kanban" && categories.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setShowCategoryModal(true)}>
            + Раздел
          </Button>
        </div>
      )}

      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Новый раздел">
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="По работе"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateCategory}>Создать</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? "Редактировать дело" : "Новое дело"}
      >
        <div className="space-y-4">
          <Select
            label="Раздел"
            value={taskForm.categoryId}
            onChange={(e) => setTaskForm({ ...taskForm, categoryId: e.target.value })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="Название"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="День выполнения"
              type="date"
              value={taskForm.scheduledDate}
              onChange={(e) => setTaskForm({ ...taskForm, scheduledDate: e.target.value })}
            />
            <Input
              label="Дедлайн"
              type="date"
              value={taskForm.deadline}
              onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
            />
          </div>
          <Select
            label="Статус"
            value={taskForm.status}
            onChange={(e) =>
              setTaskForm({ ...taskForm, status: e.target.value as Task["status"] })
            }
            options={TASK_STATUSES}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTask}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
