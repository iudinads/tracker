export type TaskStatus = "backlog" | "in_progress" | "done" | "cancelled";

export interface TaskCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  categoryId: string;
  title: string;
  scheduledDate?: string;
  deadline?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  comment?: string;
}

export interface Workout {
  id: string;
  categoryId: string;
  date: string;
  durationMinutes: number;
  avgHeartRate?: number;
  calories?: number;
  exercises: Exercise[];
  createdAt: string;
}

export interface WorkoutCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface AppData {
  taskCategories: TaskCategory[];
  tasks: Task[];
  workoutCategories: WorkoutCategory[];
  workouts: Workout[];
}

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

export const emptyData = (): AppData => ({
  taskCategories: [],
  tasks: [],
  workoutCategories: [],
  workouts: [],
});
