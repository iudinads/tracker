"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { Exercise, ExerciseSet, Workout, WorkoutCategory } from "@/lib/types";
import {
  compareWorkouts,
  directionBg,
  directionColor,
  getPreviousWorkout,
} from "@/lib/workout-comparison";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate } from "@/components/ui/badge";

interface ExerciseForm {
  id: string;
  name: string;
  sets: ExerciseSet[];
  comment: string;
}

const emptyExercise = (): ExerciseForm => ({
  id: uuidv4(),
  name: "",
  sets: [{ setNumber: 1, reps: 0, weight: 0 }],
  comment: "",
});

export function WorkoutsSection() {
  const { data, loading, refresh } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [workoutForm, setWorkoutForm] = useState({
    date: new Date().toISOString().split("T")[0],
    durationMinutes: "",
    avgHeartRate: "",
    calories: "",
    exercises: [emptyExercise()] as ExerciseForm[],
  });

  const categories = data.workoutCategories;
  const activeCategory = selectedCategory || categories[0]?.id || null;
  const categoryWorkouts = data.workouts
    .filter((w) => w.categoryId === activeCategory)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const openNewWorkout = () => {
    setEditingWorkout(null);
    setWorkoutForm({
      date: new Date().toISOString().split("T")[0],
      durationMinutes: "",
      avgHeartRate: "",
      calories: "",
      exercises: [emptyExercise()],
    });
    setShowWorkoutModal(true);
  };

  const openEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setWorkoutForm({
      date: workout.date,
      durationMinutes: workout.durationMinutes ? String(workout.durationMinutes) : "",
      avgHeartRate: workout.avgHeartRate ? String(workout.avgHeartRate) : "",
      calories: workout.calories ? String(workout.calories) : "",
      exercises: workout.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets.length > 0 ? ex.sets : [{ setNumber: 1, reps: 0, weight: 0 }],
        comment: ex.comment || "",
      })),
    });
    setShowWorkoutModal(true);
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    await apiPost<WorkoutCategory>("/api/workouts/categories", { name: categoryName });
    setCategoryName("");
    setShowCategoryModal(false);
    await refresh();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Удалить раздел и все тренировки в нём?")) return;
    await apiDelete(`/api/workouts/categories?id=${id}`);
    if (selectedCategory === id) setSelectedCategory(null);
    await refresh();
  };

  const handleSaveWorkout = async () => {
    if (!activeCategory) return;
    const exercises: Exercise[] = workoutForm.exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        id: ex.id,
        name: ex.name.trim(),
        sets: ex.sets.map((s, i) => ({
          setNumber: i + 1,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
        })),
        comment: ex.comment.trim() || undefined,
      }));

    const payload = {
      categoryId: activeCategory,
      date: workoutForm.date,
      durationMinutes: Number(workoutForm.durationMinutes) || 0,
      avgHeartRate: workoutForm.avgHeartRate ? Number(workoutForm.avgHeartRate) : undefined,
      calories: workoutForm.calories ? Number(workoutForm.calories) : undefined,
      exercises,
    };

    if (editingWorkout) {
      await apiPut("/api/workouts", { id: editingWorkout.id, ...payload });
    } else {
      await apiPost("/api/workouts", payload);
    }
    setShowWorkoutModal(false);
    await refresh();
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm("Удалить тренировку?")) return;
    await apiDelete(`/api/workouts?id=${id}`);
    await refresh();
  };

  const addExercise = () => {
    setWorkoutForm({
      ...workoutForm,
      exercises: [...workoutForm.exercises, emptyExercise()],
    });
  };

  const removeExercise = (index: number) => {
    setWorkoutForm({
      ...workoutForm,
      exercises: workoutForm.exercises.filter((_, i) => i !== index),
    });
  };

  const updateExercise = (index: number, field: keyof ExerciseForm, value: string) => {
    const exercises = [...workoutForm.exercises];
    exercises[index] = { ...exercises[index], [field]: value };
    setWorkoutForm({ ...workoutForm, exercises });
  };

  const addSet = (exerciseIndex: number) => {
    const exercises = [...workoutForm.exercises];
    const sets = exercises[exerciseIndex].sets;
    sets.push({ setNumber: sets.length + 1, reps: 0, weight: 0 });
    setWorkoutForm({ ...workoutForm, exercises });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercises = [...workoutForm.exercises];
    exercises[exerciseIndex].sets = exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    setWorkoutForm({ ...workoutForm, exercises });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string
  ) => {
    const exercises = [...workoutForm.exercises];
    const set = { ...exercises[exerciseIndex].sets[setIndex] };
    if (field === "reps" || field === "weight") {
      set[field] = Number(value) || 0;
    }
    exercises[exerciseIndex].sets[setIndex] = set;
    setWorkoutForm({ ...workoutForm, exercises });
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
          <p className="text-neutral-500">Создайте первый раздел тренировок</p>
          <p className="mt-1 text-sm text-neutral-400">Например: «Тренировка спины», «Ноги»</p>
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
            <Button size="sm" onClick={openNewWorkout}>
              + Тренировка
            </Button>
          </div>

          {categoryWorkouts.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
              Нет тренировок — добавьте первую
            </div>
          ) : (
            <div className="space-y-3">
              {categoryWorkouts.map((workout, index) => {
                const previous = getPreviousWorkout(categoryWorkouts, workout);
                const comparison = compareWorkouts(workout, previous);
                const isExpanded = expandedWorkout === workout.id;
                const showProgress = index > 0 || previous !== null;

                return (
                  <div
                    key={workout.id}
                    className="rounded-xl border border-neutral-100 bg-white overflow-hidden"
                  >
                    <button
                      className="w-full p-4 text-left hover:bg-neutral-50 transition"
                      onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{formatDate(workout.date)}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                            {workout.durationMinutes > 0 && (
                              <span>{workout.durationMinutes} мин</span>
                            )}
                            {workout.avgHeartRate && (
                              <span>{workout.avgHeartRate} bpm</span>
                            )}
                            {workout.calories && <span>{workout.calories} kcal</span>}
                            <span>{workout.exercises.length} упражн.</span>
                          </div>
                        </div>
                        <span className="text-neutral-400">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 pb-4">
                        {showProgress && previous && (
                          <p className="mt-3 mb-2 text-xs text-neutral-400">
                            Сравнение с {formatDate(previous.date)}
                          </p>
                        )}

                        <div className="space-y-3">
                          {workout.exercises.map((exercise) => {
                            const exComp = comparison.exerciseComparisons.find(
                              (c) => c.exerciseName.toLowerCase() === exercise.name.toLowerCase()
                            );
                            const isNew = exComp?.isNew && showProgress;
                            const hasChanges = exComp && exComp.changes.length > 0;

                            let borderClass = "border-neutral-100";
                            if (isNew) borderClass = "border-blue-200 bg-blue-50/50";
                            else if (hasChanges) {
                              const hasBetter = exComp.changes.some((c) => c.direction === "better");
                              const hasWorse = exComp.changes.some((c) => c.direction === "worse");
                              if (hasBetter && !hasWorse) borderClass = "border-emerald-200 bg-emerald-50/50";
                              else if (hasWorse && !hasBetter) borderClass = "border-red-200 bg-red-50/50";
                              else borderClass = "border-amber-200 bg-amber-50/50";
                            }

                            return (
                              <div
                                key={exercise.id}
                                className={`rounded-lg border p-3 ${borderClass}`}
                              >
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{exercise.name}</p>
                                  {isNew && (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                      новое
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 space-y-1">
                                  {exercise.sets.map((set) => (
                                    <p key={set.setNumber} className="text-xs text-neutral-600">
                                      {set.setNumber} подход — {set.reps} повт. — {set.weight} кг
                                    </p>
                                  ))}
                                </div>

                                {exercise.comment && (
                                  <p className="mt-2 text-xs text-neutral-500 italic">
                                    {exercise.comment}
                                  </p>
                                )}

                                {hasChanges && exComp && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {exComp.changes.map((change) => (
                                      <span
                                        key={change.label}
                                        className={`rounded-md border px-2 py-0.5 text-xs ${directionBg(change.direction)} ${directionColor(change.direction)}`}
                                      >
                                        {change.label}: {change.previous} → {change.current}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditWorkout(workout)}>
                            Редактировать
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteWorkout(workout.id)}>
                            Удалить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Новый раздел">
        <div className="space-y-4">
          <Input
            label="Название"
            placeholder="Тренировка спины"
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
        open={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        title={editingWorkout ? "Редактировать тренировку" : "Новая тренировка"}
        wide
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              label="Дата"
              type="date"
              value={workoutForm.date}
              onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
            />
            <Input
              label="Время (мин)"
              type="number"
              min={0}
              value={workoutForm.durationMinutes}
              onChange={(e) => setWorkoutForm({ ...workoutForm, durationMinutes: e.target.value })}
            />
            <Input
              label="Пульс (bpm)"
              type="number"
              min={0}
              value={workoutForm.avgHeartRate}
              onChange={(e) => setWorkoutForm({ ...workoutForm, avgHeartRate: e.target.value })}
            />
            <Input
              label="Калории"
              type="number"
              min={0}
              value={workoutForm.calories}
              onChange={(e) => setWorkoutForm({ ...workoutForm, calories: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Упражнения</h4>
              <Button size="sm" variant="secondary" onClick={addExercise}>
                + Упражнение
              </Button>
            </div>

            {workoutForm.exercises.map((exercise, exIndex) => (
              <div key={exercise.id} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    label="Название упражнения"
                    placeholder="Жим лёжа"
                    value={exercise.name}
                    onChange={(e) => updateExercise(exIndex, "name", e.target.value)}
                    className="flex-1"
                  />
                  {workoutForm.exercises.length > 1 && (
                    <button
                      onClick={() => removeExercise(exIndex)}
                      className="self-end mb-0.5 rounded-lg p-2 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-500">Подходы</p>
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className="flex items-end gap-2">
                      <span className="pb-2 text-xs text-neutral-400 w-6">{setIndex + 1}.</span>
                      <Input
                        label="Повторения"
                        type="number"
                        min={0}
                        value={set.reps || ""}
                        onChange={(e) => updateSet(exIndex, setIndex, "reps", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        label="Вес (кг)"
                        type="number"
                        min={0}
                        step="0.5"
                        value={set.weight || ""}
                        onChange={(e) => updateSet(exIndex, setIndex, "weight", e.target.value)}
                        className="flex-1"
                      />
                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exIndex, setIndex)}
                          className="pb-2 text-neutral-300 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addSet(exIndex)}>
                    + Подход
                  </Button>
                </div>

                <Textarea
                  label="Комментарий"
                  placeholder="4-й подход было тяжело"
                  rows={2}
                  value={exercise.comment}
                  onChange={(e) => updateExercise(exIndex, "comment", e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowWorkoutModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveWorkout}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
