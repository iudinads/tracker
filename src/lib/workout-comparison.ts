import { Exercise, Workout } from "./types";

export type ChangeDirection = "better" | "worse" | "same" | "new";

export interface MetricChange {
  label: string;
  previous: string;
  current: string;
  direction: ChangeDirection;
}

export interface ExerciseComparison {
  exerciseName: string;
  isNew: boolean;
  changes: MetricChange[];
}

export interface WorkoutComparison {
  previousWorkout: Workout | null;
  exerciseComparisons: ExerciseComparison[];
}

export type ProgressAction = "weight" | "reps" | "sets";

export interface ProgressRecommendation {
  exerciseName: string;
  normalizedName: string;
  action: ProgressAction;
  lastWeight: number;
  lastSets: number;
  lastReps: number;
  suggestedWeight: number;
  suggestedSets: number;
  suggestedReps: number;
  weightDelta: number;
  reasons: string[];
  summary: string;
}

const EASY_PHRASE = "было легко";
const MAX_SETS = 4;
const MAX_REPS = 12;
const REP_STEP = 2;
const MIN_REPS = 6;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function maxWeight(exercise: Exercise): number {
  if (exercise.sets.length === 0) return 0;
  return Math.max(...exercise.sets.map((s) => s.weight));
}

function totalReps(exercise: Exercise): number {
  return exercise.sets.reduce((sum, s) => sum + s.reps, 0);
}

function compareMetric(
  label: string,
  prev: number,
  curr: number,
  higherIsBetter: boolean
): MetricChange {
  const direction: ChangeDirection =
    curr === prev
      ? "same"
      : higherIsBetter
        ? curr > prev
          ? "better"
          : "worse"
        : curr < prev
          ? "better"
          : "worse";

  return {
    label,
    previous: String(prev),
    current: String(curr),
    direction,
  };
}

export function compareWorkouts(
  current: Workout,
  previous: Workout | null
): WorkoutComparison {
  if (!previous) {
    return {
      previousWorkout: null,
      exerciseComparisons: current.exercises.map((ex) => ({
        exerciseName: ex.name,
        isNew: true,
        changes: [],
      })),
    };
  }

  const prevMap = new Map(
    previous.exercises.map((ex) => [normalizeName(ex.name), ex])
  );

  const comparisons: ExerciseComparison[] = current.exercises.map((currEx) => {
    const prevEx = prevMap.get(normalizeName(currEx.name));

    if (!prevEx) {
      return {
        exerciseName: currEx.name,
        isNew: true,
        changes: [],
      };
    }

    const changes: MetricChange[] = [];

    const setsChange = compareMetric(
      "Подходы",
      prevEx.sets.length,
      currEx.sets.length,
      true
    );
    if (setsChange.direction !== "same") changes.push(setsChange);

    const repsChange = compareMetric(
      "Повторения",
      totalReps(prevEx),
      totalReps(currEx),
      true
    );
    if (repsChange.direction !== "same") changes.push(repsChange);

    const weightChange = compareMetric(
      "Макс. вес",
      maxWeight(prevEx),
      maxWeight(currEx),
      true
    );
    if (weightChange.direction !== "same") changes.push(weightChange);

    return {
      exerciseName: currEx.name,
      isNew: false,
      changes,
    };
  });

  return {
    previousWorkout: previous,
    exerciseComparisons: comparisons,
  };
}

export function getPreviousWorkout(
  workouts: Workout[],
  current: Workout
): Workout | null {
  const sorted = [...workouts]
    .filter((w) => w.categoryId === current.categoryId && w.id !== current.id)
    .sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const currentTime = new Date(current.date).getTime();
  const before = sorted.filter(
    (w) =>
      new Date(w.date).getTime() < currentTime ||
      (w.date === current.date &&
        new Date(w.createdAt).getTime() < new Date(current.createdAt).getTime())
  );

  return before.length > 0 ? before[before.length - 1] : null;
}

function minReps(exercise: Exercise): number {
  if (exercise.sets.length === 0) return 0;
  return Math.min(...exercise.sets.map((s) => s.reps));
}

function buildRecommendation(
  lastEx: Exercise,
  action: ProgressAction,
  suggestedWeight: number,
  suggestedSets: number,
  suggestedReps: number,
  weightDelta: number,
  reasons: string[],
  summary: string
): ProgressRecommendation {
  return {
    exerciseName: lastEx.name,
    normalizedName: normalizeName(lastEx.name),
    action,
    lastWeight: maxWeight(lastEx),
    lastSets: lastEx.sets.length,
    lastReps: minReps(lastEx),
    suggestedWeight,
    suggestedSets,
    suggestedReps,
    weightDelta,
    reasons,
    summary,
  };
}

function analyzeExerciseProgress(
  lastEx: Exercise,
  prevEx: Exercise | null
): ProgressRecommendation | null {
  const sets = lastEx.sets.length;
  if (sets === 0) return null;

  const reps = minReps(lastEx);
  const weight = maxWeight(lastEx);
  if (weight <= 0 && reps <= 0) return null;

  const wasEasy = lastEx.comment?.toLowerCase().includes(EASY_PHRASE) ?? false;
  const extraSets = prevEx ? sets - prevEx.sets.length : 0;
  const extraReps = prevEx ? totalReps(lastEx) - totalReps(prevEx) : 0;
  const progressed = wasEasy || extraReps >= 3 || extraSets >= 1;

  if (!progressed) return null;

  const atRepCeiling = reps >= MAX_REPS;

  // 1. Вес: достигли 12 повторений или было легко на высоких повторах
  if (weight > 0 && (atRepCeiling || (wasEasy && reps >= 10))) {
    const strong =
      atRepCeiling ||
      (wasEasy && (extraReps >= 6 || extraSets >= 1 || reps >= MAX_REPS));
    const weightDelta = strong ? 5 : 2.5;
    const suggestedReps = atRepCeiling
      ? Math.max(MIN_REPS, MAX_REPS - REP_STEP)
      : Math.max(MIN_REPS, reps - REP_STEP);

    const reasons: string[] = [];
    if (wasEasy) reasons.push("в прошлый раз было легко");
    if (atRepCeiling) reasons.push(`${MAX_REPS} повторений — пора добавить вес`);

    return buildRecommendation(
      lastEx,
      "weight",
      weight + weightDelta,
      sets,
      suggestedReps,
      weightDelta,
      reasons,
      `${weight + weightDelta} кг × ${suggestedReps} повт. × ${sets} подх. (было ${weight} кг × ${reps})`
    );
  }

  // 2. Повторения: +2 до 12, вес тот же
  if (reps < MAX_REPS) {
    const suggestedReps = Math.min(MAX_REPS, reps + REP_STEP);
    if (suggestedReps > reps) {
      const reasons: string[] = [];
      if (wasEasy) reasons.push("в прошлый раз было легко");
      if (extraReps >= 3) reasons.push("рост повторений");

      return buildRecommendation(
        lastEx,
        "reps",
        weight,
        sets,
        suggestedReps,
        0,
        reasons,
        `${suggestedReps} повт. × ${sets} подх., ${weight} кг (было ${reps} повт.)`
      );
    }
  }

  // 3. Подходы: было легко, повторения не выросли, есть запас по подходам
  if (
    wasEasy &&
    sets < MAX_SETS &&
    reps >= MIN_REPS &&
    reps < MAX_REPS &&
    extraSets < 1 &&
    extraReps <= 0
  ) {
    return buildRecommendation(
      lastEx,
      "sets",
      weight,
      sets + 1,
      reps,
      0,
      ["в прошлый раз было легко", "повторения стабильны — добавьте подход"],
      `${sets + 1} подх. × ${reps} повт., ${weight} кг (было ${sets} подх.)`
    );
  }

  return null;
}

export function getProgressRecommendations(
  lastWorkout: Workout,
  previousWorkout: Workout | null
): ProgressRecommendation[] {
  const prevMap = new Map(
    (previousWorkout?.exercises ?? []).map((ex) => [normalizeName(ex.name), ex])
  );

  const recommendations: ProgressRecommendation[] = [];

  for (const lastEx of lastWorkout.exercises) {
    const prevEx = prevMap.get(normalizeName(lastEx.name)) ?? null;
    const recommendation = analyzeExerciseProgress(lastEx, prevEx);
    if (recommendation) recommendations.push(recommendation);
  }

  return recommendations;
}

export function progressActionLabel(action: ProgressAction): string {
  switch (action) {
    case "weight":
      return "Добавить вес";
    case "reps":
      return "Добавить повторения";
    case "sets":
      return "Добавить подход";
  }
}

export function directionColor(direction: ChangeDirection): string {
  switch (direction) {
    case "better":
      return "text-emerald-600";
    case "worse":
      return "text-red-500";
    case "new":
      return "text-blue-600";
    default:
      return "text-neutral-500";
  }
}

export function directionBg(direction: ChangeDirection): string {
  switch (direction) {
    case "better":
      return "bg-emerald-50 border-emerald-200";
    case "worse":
      return "bg-red-50 border-red-200";
    case "new":
      return "bg-blue-50 border-blue-200";
    default:
      return "bg-neutral-50 border-neutral-200";
  }
}
