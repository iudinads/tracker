export type NutrientStatus = "green" | "yellow" | "red";

export function getNutrientStatus(actual: number, goal: number): NutrientStatus {
  if (goal <= 0) return "green";
  const diffPercent = (Math.abs(actual - goal) / goal) * 100;
  if (diffPercent <= 10) return "green";
  if (diffPercent <= 30) return "yellow";
  return "red";
}

export const statusColors: Record<NutrientStatus, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
};

export interface DayTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function sumMeals(
  meals: { calories: number; protein: number; fat: number; carbs: number }[]
): DayTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}
