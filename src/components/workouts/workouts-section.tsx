"use client";

import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { Exercise, ExerciseSet, Workout, WorkoutCategory, WorkoutTemplate, WorkoutTemplateExercise } from "@/lib/types";
import {
  compareWorkouts,
  directionBg,
  directionColor,
  getPreviousWorkout,
  getProgressRecommendations,
  progressActionLabel,
  ProgressRecommendation,
} from "@/lib/workout-comparison";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate } from "@/components/ui/badge";
import {
  durationToSeconds,
  formatPace,
  formatRunDuration,
  isRunCategory,
  parseDurationParts,
  runWorkoutSummary,
} from "@/lib/workout-run";

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

interface TemplateExerciseForm {
  name: string;
  setsCount: string;
  comment: string;
}

const emptyTemplateExercise = (): TemplateExerciseForm => ({
  name: "",
  setsCount: "3",
  comment: "",
});

function exercisesFromTemplate(template: WorkoutTemplate): ExerciseForm[] {
  return template.exercises.map((ex) => ({
    id: uuidv4(),
    name: ex.name,
    sets: Array.from({ length: ex.setsCount }, (_, i) => ({
      setNumber: i + 1,
      reps: 0,
      weight: 0,
    })),
    comment: ex.comment || "",
  }));
}

const emptyWorkoutForm = () => ({
  date: new Date().toISOString().split("T")[0],
  durationMinutes: "",
  avgHeartRate: "",
  calories: "",
  runHours: "",
  runMinutes: "",
  runSeconds: "",
  distanceKm: "",
  elevationM: "",
  paceMinutes: "",
  paceSeconds: "",
  exercises: [emptyExercise()] as ExerciseForm[],
});

export function WorkoutsSection() {
  const { data, loading, refresh } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateFormModal, setShowTemplateFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm());
  const [templateForm, setTemplateForm] = useState({
    name: "",
    exercises: [emptyTemplateExercise()] as TemplateExerciseForm[],
  });

  const categories = data.workoutCategories;
  const activeCategory = selectedCategory || categories[0]?.id || null;
  const activeCategoryName =
    categories.find((c) => c.id === activeCategory)?.name ?? "";
  const isRunActive = isRunCategory(activeCategoryName);
  const categoryTemplates = data.workoutTemplates.filter(
    (t) => t.categoryId === activeCategory
  );
  const categoryWorkouts = data.workouts
    .filter((w) => w.categoryId === activeCategory)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const progressRecommendations = useMemo(() => {
    if (!activeCategory || isRunActive || categoryWorkouts.length === 0) return [];
    const lastWorkout = categoryWorkouts[0];
    const previous = getPreviousWorkout(categoryWorkouts, lastWorkout);
    return getProgressRecommendations(lastWorkout, previous);
  }, [activeCategory, isRunActive, categoryWorkouts]);

  const recommendationMap = useMemo(
    () => new Map(progressRecommendations.map((r) => [r.normalizedName, r])),
    [progressRecommendations]
  );

  const getRecommendation = (name: string): ProgressRecommendation | undefined =>
    recommendationMap.get(name.trim().toLowerCase());

  const openNewWorkout = () => {
    setEditingWorkout(null);
    const base = emptyWorkoutForm();
    setWorkoutForm(
      isRunActive ? { ...base, exercises: [] } : base
    );
    setShowWorkoutModal(true);
  };

  const applyTemplate = (template: WorkoutTemplate) => {
    setWorkoutForm((prev) => ({
      ...prev,
      exercises: exercisesFromTemplate(template),
    }));
    setShowTemplateModal(false);
    setShowWorkoutModal(true);
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      exercises: [emptyTemplateExercise()],
    });
    setShowTemplateFormModal(true);
  };

  const openEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      exercises: template.exercises.map((ex) => ({
        name: ex.name,
        setsCount: String(ex.setsCount),
        comment: ex.comment || "",
      })),
    });
    setShowTemplateFormModal(true);
  };

  const openEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    const duration = parseDurationParts(workout.runDurationSeconds);
    const categoryIsRun = isRunCategory(
      categories.find((c) => c.id === workout.categoryId)?.name ?? ""
    );

    setWorkoutForm({
      date: workout.date,
      durationMinutes: workout.durationMinutes ? String(workout.durationMinutes) : "",
      avgHeartRate: workout.avgHeartRate ? String(workout.avgHeartRate) : "",
      calories: workout.calories ? String(workout.calories) : "",
      runHours: duration.hours,
      runMinutes: duration.minutes,
      runSeconds: duration.seconds,
      distanceKm: workout.distanceKm ? String(workout.distanceKm) : "",
      elevationM: workout.elevationM ? String(workout.elevationM) : "",
      paceMinutes:
        workout.paceMinutes !== undefined ? String(workout.paceMinutes) : "",
      paceSeconds:
        workout.paceSeconds !== undefined ? String(workout.paceSeconds) : "",
      exercises: categoryIsRun
        ? []
        : workout.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            sets:
              ex.sets.length > 0
                ? ex.sets
                : [{ setNumber: 1, reps: 0, weight: 0 }],
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

    let payload;

    if (isRunActive) {
      const totalSeconds = durationToSeconds(
        workoutForm.runHours,
        workoutForm.runMinutes,
        workoutForm.runSeconds
      );
      const paceMin =
        workoutForm.paceMinutes !== "" ? Number(workoutForm.paceMinutes) : undefined;
      const paceSec =
        workoutForm.paceSeconds !== "" ? Number(workoutForm.paceSeconds) : undefined;

      payload = {
        categoryId: activeCategory,
        date: workoutForm.date,
        durationMinutes: totalSeconds ? Math.floor(totalSeconds / 60) : 0,
        avgHeartRate: workoutForm.avgHeartRate
          ? Number(workoutForm.avgHeartRate)
          : undefined,
        calories: workoutForm.calories ? Number(workoutForm.calories) : undefined,
        runDurationSeconds: totalSeconds || undefined,
        distanceKm: workoutForm.distanceKm
          ? Number(workoutForm.distanceKm)
          : undefined,
        elevationM: workoutForm.elevationM
          ? Number(workoutForm.elevationM)
          : undefined,
        paceMinutes: paceMin,
        paceSeconds: paceSec,
        exercises: [],
      };
    } else {
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

      payload = {
        categoryId: activeCategory,
        date: workoutForm.date,
        durationMinutes: Number(workoutForm.durationMinutes) || 0,
        avgHeartRate: workoutForm.avgHeartRate
          ? Number(workoutForm.avgHeartRate)
          : undefined,
        calories: workoutForm.calories ? Number(workoutForm.calories) : undefined,
        exercises,
      };
    }

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

  const handleSaveTemplate = async () => {
    if (!activeCategory || !templateForm.name.trim()) return;
    const exercises: WorkoutTemplateExercise[] = templateForm.exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        setsCount: Math.max(1, Number(ex.setsCount) || 1),
        comment: ex.comment.trim() || undefined,
      }));

    if (exercises.length === 0) return;

    const payload = {
      name: templateForm.name,
      categoryId: activeCategory,
      exercises,
    };

    if (editingTemplate) {
      await apiPut("/api/workouts/templates", { id: editingTemplate.id, ...payload });
    } else {
      await apiPost("/api/workouts/templates", payload);
    }
    setShowTemplateFormModal(false);
    await refresh();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;
    await apiDelete(`/api/workouts/templates?id=${id}`);
    await refresh();
  };

  const addTemplateExercise = () => {
    setTemplateForm({
      ...templateForm,
      exercises: [...templateForm.exercises, emptyTemplateExercise()],
    });
  };

  const removeTemplateExercise = (index: number) => {
    setTemplateForm({
      ...templateForm,
      exercises: templateForm.exercises.filter((_, i) => i !== index),
    });
  };

  const updateTemplateExercise = (
    index: number,
    field: keyof TemplateExerciseForm,
    value: string
  ) => {
    const exercises = [...templateForm.exercises];
    exercises[index] = { ...exercises[index], [field]: value };
    setTemplateForm({ ...templateForm, exercises });
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

  const applyRecommendation = (
    exerciseIndex: number,
    rec: ProgressRecommendation
  ) => {
    const exercises = [...workoutForm.exercises];
    let sets = [...exercises[exerciseIndex].sets];

    while (sets.length < rec.suggestedSets) {
      sets.push({
        setNumber: sets.length + 1,
        reps: rec.suggestedReps,
        weight: rec.suggestedWeight,
      });
    }
    while (sets.length > rec.suggestedSets) {
      sets.pop();
    }
    sets = sets.map((s, i) => ({
      setNumber: i + 1,
      reps: rec.suggestedReps,
      weight: rec.suggestedWeight,
    }));

    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
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
            <div className="flex gap-2">
              {!isRunActive && (
                <Button size="sm" variant="secondary" onClick={() => setShowTemplateModal(true)}>
                  Шаблоны
                </Button>
              )}
              <Button size="sm" onClick={openNewWorkout}>
                + {isRunActive ? "Забег" : "Тренировка"}
              </Button>
            </div>
          </div>

          {categoryWorkouts.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
              Нет тренировок — добавьте первую
            </div>
          ) : (
            <div className="space-y-3">
              {categoryWorkouts.map((workout, index) => {
                const workoutIsRun = isRunCategory(
                  categories.find((c) => c.id === workout.categoryId)?.name ?? ""
                );
                const previous = workoutIsRun
                  ? null
                  : getPreviousWorkout(categoryWorkouts, workout);
                const comparison = workoutIsRun
                  ? null
                  : compareWorkouts(workout, previous);
                const isExpanded = expandedWorkout === workout.id;
                const showProgress = !workoutIsRun && (index > 0 || previous !== null);
                const runSummary = workoutIsRun ? runWorkoutSummary(workout) : [];

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
                            {workoutIsRun ? (
                              runSummary.length > 0 ? (
                                runSummary.map((part) => <span key={part}>{part}</span>)
                              ) : (
                                <span>Нет данных</span>
                              )
                            ) : (
                              <>
                                {workout.durationMinutes > 0 && (
                                  <span>{workout.durationMinutes} мин</span>
                                )}
                                {workout.avgHeartRate && (
                                  <span>{workout.avgHeartRate} bpm</span>
                                )}
                                {workout.calories && <span>{workout.calories} kcal</span>}
                                <span>{workout.exercises.length} упражн.</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-neutral-400">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 pb-4">
                        {workoutIsRun ? (
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-neutral-400">Время</p>
                              <p className="font-medium">
                                {formatRunDuration(workout.runDurationSeconds) || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400">Дистанция</p>
                              <p className="font-medium">
                                {workout.distanceKm ? `${workout.distanceKm} км` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400">Темп</p>
                              <p className="font-medium">
                                {formatPace(workout.paceMinutes, workout.paceSeconds)
                                  ? `${formatPace(workout.paceMinutes, workout.paceSeconds)} /км`
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400">Пульс</p>
                              <p className="font-medium">
                                {workout.avgHeartRate ? `${workout.avgHeartRate} bpm` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400">Калории</p>
                              <p className="font-medium">
                                {workout.calories ? `${workout.calories} kcal` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-400">Подъём</p>
                              <p className="font-medium">
                                {workout.elevationM ? `${workout.elevationM} м` : "—"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                        {showProgress && previous && (
                          <p className="mt-3 mb-2 text-xs text-neutral-400">
                            Сравнение с {formatDate(previous.date)}
                          </p>
                        )}

                        <div className="space-y-3">
                          {workout.exercises.map((exercise) => {
                            const exComp = comparison?.exerciseComparisons.find(
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
                          </>
                        )}

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
        title={
          (editingWorkout
            ? isRunCategory(
                categories.find((c) => c.id === editingWorkout.categoryId)?.name ?? ""
              )
            : isRunActive)
            ? editingWorkout
              ? "Редактировать забег"
              : "Новый забег"
            : editingWorkout
              ? "Редактировать тренировку"
              : "Новая тренировка"
        }
        wide
      >
        <div className="space-y-5">
          {(editingWorkout
            ? isRunCategory(
                categories.find((c) => c.id === editingWorkout.categoryId)?.name ?? ""
              )
            : isRunActive) ? (
            <>
              <Input
                label="Дата"
                type="date"
                value={workoutForm.date}
                onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
              />
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">Время</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Часы"
                    type="number"
                    min={0}
                    value={workoutForm.runHours}
                    onChange={(e) =>
                      setWorkoutForm({ ...workoutForm, runHours: e.target.value })
                    }
                    placeholder="0"
                  />
                  <Input
                    label="Минуты"
                    type="number"
                    min={0}
                    value={workoutForm.runMinutes}
                    onChange={(e) =>
                      setWorkoutForm({ ...workoutForm, runMinutes: e.target.value })
                    }
                    placeholder="45"
                  />
                  <Input
                    label="Секунды"
                    type="number"
                    min={0}
                    max={59}
                    value={workoutForm.runSeconds}
                    onChange={(e) =>
                      setWorkoutForm({ ...workoutForm, runSeconds: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Дистанция (км)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={workoutForm.distanceKm}
                  onChange={(e) =>
                    setWorkoutForm({ ...workoutForm, distanceKm: e.target.value })
                  }
                />
                <Input
                  label="Подъём (м)"
                  type="number"
                  min={0}
                  value={workoutForm.elevationM}
                  onChange={(e) =>
                    setWorkoutForm({ ...workoutForm, elevationM: e.target.value })
                  }
                />
                <Input
                  label="Средний пульс (bpm)"
                  type="number"
                  min={0}
                  value={workoutForm.avgHeartRate}
                  onChange={(e) =>
                    setWorkoutForm({ ...workoutForm, avgHeartRate: e.target.value })
                  }
                />
                <Input
                  label="Калории"
                  type="number"
                  min={0}
                  value={workoutForm.calories}
                  onChange={(e) =>
                    setWorkoutForm({ ...workoutForm, calories: e.target.value })
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Средний темп (мин/км)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Минуты"
                    type="number"
                    min={0}
                    value={workoutForm.paceMinutes}
                    onChange={(e) =>
                      setWorkoutForm({ ...workoutForm, paceMinutes: e.target.value })
                    }
                    placeholder="5"
                  />
                  <Input
                    label="Секунды"
                    type="number"
                    min={0}
                    max={59}
                    value={workoutForm.paceSeconds}
                    onChange={(e) =>
                      setWorkoutForm({ ...workoutForm, paceSeconds: e.target.value })
                    }
                    placeholder="30"
                  />
                </div>
                {workoutForm.paceMinutes !== "" && workoutForm.paceSeconds !== "" && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {formatPace(
                      Number(workoutForm.paceMinutes),
                      Number(workoutForm.paceSeconds)
                    )}{" "}
                    /км
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
          {!editingWorkout && progressRecommendations.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-900">Рекомендации по прогрессу</p>
              <p className="mt-1 text-xs text-emerald-800">
                Сначала +2 повторения (до 12), затем вес с небольшой просадкой в повторениях.
                Подходов не больше 4. На основе тренировки от {formatDate(categoryWorkouts[0]?.date)}.
              </p>
            </div>
          )}

          {!editingWorkout && !isRunActive && categoryTemplates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">Из шаблона</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() =>
                      setWorkoutForm((prev) => ({
                        ...prev,
                        exercises: exercisesFromTemplate(template),
                      }))
                    }
                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-400"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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

            {workoutForm.exercises.map((exercise, exIndex) => {
              const recommendation = !editingWorkout
                ? getRecommendation(exercise.name)
                : undefined;

              return (
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

                {recommendation && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-800">
                    <p className="font-medium text-emerald-900">
                      {progressActionLabel(recommendation.action)}: {recommendation.summary}
                    </p>
                    <p className="mt-1">
                      Было: {recommendation.lastWeight} кг × {recommendation.lastReps} повт. ×{" "}
                      {recommendation.lastSets} подх.
                      {recommendation.reasons.length > 0 &&
                        ` · ${recommendation.reasons.join(", ")}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyRecommendation(exIndex, recommendation)}
                      className="mt-2 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
                    >
                      Подставить
                    </button>
                  </div>
                )}

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
              );
            })}
          </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowWorkoutModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveWorkout}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Шаблоны тренировок"
        wide
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewTemplate}>
              + Шаблон
            </Button>
          </div>

          {categoryTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              Нет шаблонов для этого раздела. Создайте шаблон с упражнениями и количеством подходов.
            </p>
          ) : (
            <div className="space-y-2">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-neutral-100 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {template.exercises.map((ex) => `${ex.name} (${ex.setsCount} подх.)`).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => applyTemplate(template)}>
                      Использовать
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditTemplate(template)}>
                      Изменить
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteTemplate(template.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showTemplateFormModal}
        onClose={() => setShowTemplateFormModal(false)}
        title={editingTemplate ? "Редактировать шаблон" : "Новый шаблон"}
        wide
      >
        <div className="space-y-5">
          <Input
            label="Название шаблона"
            placeholder="Тренировка спины"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            autoFocus
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Упражнения</h4>
              <Button size="sm" variant="secondary" onClick={addTemplateExercise}>
                + Упражнение
              </Button>
            </div>

            {templateForm.exercises.map((exercise, exIndex) => (
              <div key={exIndex} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    label="Название упражнения"
                    placeholder="Жим лёжа"
                    value={exercise.name}
                    onChange={(e) => updateTemplateExercise(exIndex, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    label="Подходов"
                    type="number"
                    min={1}
                    value={exercise.setsCount}
                    onChange={(e) => updateTemplateExercise(exIndex, "setsCount", e.target.value)}
                    className="w-24"
                  />
                  {templateForm.exercises.length > 1 && (
                    <button
                      onClick={() => removeTemplateExercise(exIndex)}
                      className="self-end mb-0.5 rounded-lg p-2 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
                <Textarea
                  label="Комментарий"
                  placeholder="Заметка к упражнению"
                  rows={2}
                  value={exercise.comment}
                  onChange={(e) => updateTemplateExercise(exIndex, "comment", e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTemplateFormModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTemplate}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
