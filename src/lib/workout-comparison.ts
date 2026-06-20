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
