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

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface NutritionGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface SavedDish {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: string;
}

export interface MealEntry {
  id: string;
  date: string;
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: string;
}

export type CalendarEventCategory =
  | "party"
  | "workout"
  | "work"
  | "personal"
  | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  category: CalendarEventCategory;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  taskCategories: TaskCategory[];
  tasks: Task[];
  workoutCategories: WorkoutCategory[];
  workouts: Workout[];
  nutritionGoals: NutritionGoals;
  savedDishes: SavedDish[];
  mealEntries: MealEntry[];
  calendarEvents: CalendarEvent[];
}

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

export const defaultNutritionGoals = (): NutritionGoals => ({
  calories: 2000,
  protein: 120,
  fat: 70,
  carbs: 250,
});

export const CALENDAR_CATEGORIES: {
  value: CalendarEventCategory;
  label: string;
  ring: string;
  dot: string;
  badge: string;
}[] = [
  { value: "party", label: "Тусовка", ring: "ring-pink-400", dot: "bg-pink-400", badge: "bg-pink-50 text-pink-700" },
  { value: "workout", label: "Тренировка", ring: "ring-green-500", dot: "bg-green-500", badge: "bg-green-50 text-green-700" },
  { value: "work", label: "Дела рабочие", ring: "ring-purple-500", dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700" },
  { value: "personal", label: "Дела личные", ring: "ring-sky-400", dot: "bg-sky-400", badge: "bg-sky-50 text-sky-700" },
  { value: "other", label: "Остальное", ring: "ring-neutral-400", dot: "bg-neutral-400", badge: "bg-neutral-100 text-neutral-600" },
];

export const emptyData = (): AppData => ({
  taskCategories: [],
  tasks: [],
  workoutCategories: [],
  workouts: [],
  nutritionGoals: defaultNutritionGoals(),
  savedDishes: [],
  mealEntries: [],
  calendarEvents: [],
});
