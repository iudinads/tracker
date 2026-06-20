import fs from "fs";
import path from "path";
import { AppData, defaultNutritionGoals, emptyData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tracker.json");

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData(), null, 2), "utf-8");
  }
}

function normalizeData(raw: Partial<AppData>): AppData {
  const base = emptyData();
  return {
    taskCategories: raw.taskCategories ?? base.taskCategories,
    tasks: raw.tasks ?? base.tasks,
    workoutCategories: raw.workoutCategories ?? base.workoutCategories,
    workouts: raw.workouts ?? base.workouts,
    nutritionGoals: raw.nutritionGoals ?? defaultNutritionGoals(),
    savedDishes: raw.savedDishes ?? base.savedDishes,
    mealEntries: raw.mealEntries ?? base.mealEntries,
    calendarEvents: raw.calendarEvents ?? base.calendarEvents,
    englishTopics: raw.englishTopics ?? base.englishTopics,
    englishWords: raw.englishWords ?? base.englishWords,
    grammarRules: raw.grammarRules ?? base.grammarRules,
    dsNotes: raw.dsNotes ?? base.dsNotes,
  };
}

export function readData(): AppData {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return normalizeData(JSON.parse(raw) as Partial<AppData>);
}

export function writeData(data: AppData): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}
