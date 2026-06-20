"use client";

import { useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { TASK_STATUSES, Task, TaskCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge, formatDate } from "@/components/ui/badge";

export function TasksSection() {
  const { data, loading, refresh } = useData();
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
  });

  const categories = data.taskCategories;
  const activeCategory = selectedCategory || categories[0]?.id || null;
  const categoryTasks = data.tasks
    .filter((t) => t.categoryId === activeCategory)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({ title: "", scheduledDate: "", deadline: "", status: "backlog" });
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      scheduledDate: task.scheduledDate || "",
      deadline: task.deadline || "",
      status: task.status,
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
    if (!taskForm.title.trim() || !activeCategory) return;
    if (editingTask) {
      await apiPut("/api/tasks", { id: editingTask.id, ...taskForm });
    } else {
      await apiPost("/api/tasks", { categoryId: activeCategory, ...taskForm });
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Разделы</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowCategoryModal(true)}>
          + Раздел
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">Создайте первый раздел</p>
          <p className="mt-1 text-sm text-neutral-400">Например: «По работе», «Дом», «Учёба»</p>
          <Button className="mt-4" size="sm" onClick={() => setShowCategoryModal(true)}>
            Создать раздел
          </Button>
        </div>
      ) : (
        <>
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

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-700">
              {categories.find((c) => c.id === activeCategory)?.name}
            </h3>
            <Button size="sm" onClick={openNewTask}>
              + Дело
            </Button>
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
                    <button
                      className="flex-1 text-left"
                      onClick={() => openEditTask(task)}
                    >
                      <p className={`font-medium ${task.status === "cancelled" ? "line-through text-neutral-400" : ""}`}>
                        {task.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <StatusBadge status={task.status} />
                        {task.scheduledDate && (
                          <span>📅 {formatDate(task.scheduledDate)}</span>
                        )}
                        {task.deadline && (
                          <span>⏰ до {formatDate(task.deadline)}</span>
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
