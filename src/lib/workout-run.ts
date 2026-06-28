import { Workout } from "./types";

export function isRunCategory(name: string): boolean {
  return name.trim().toLowerCase() === "run";
}

export function formatRunDuration(totalSeconds?: number): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPace(paceMinutes?: number, paceSeconds?: number): string | null {
  if (paceMinutes === undefined || paceSeconds === undefined) return null;
  if (paceMinutes < 0 || paceSeconds < 0) return null;
  return `${paceMinutes}'${String(paceSeconds).padStart(2, "0")}''`;
}

export function parseDurationParts(totalSeconds?: number): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  if (!totalSeconds || totalSeconds <= 0) {
    return { hours: "", minutes: "", seconds: "" };
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    hours: h > 0 ? String(h) : "",
    minutes: String(m),
    seconds: String(s),
  };
}

export function durationToSeconds(
  hours: string,
  minutes: string,
  seconds: string
): number {
  return (
    (Number(hours) || 0) * 3600 +
    (Number(minutes) || 0) * 60 +
    (Number(seconds) || 0)
  );
}

export function runWorkoutSummary(workout: Workout): string[] {
  const parts: string[] = [];
  const time = formatRunDuration(workout.runDurationSeconds);
  const pace = formatPace(workout.paceMinutes, workout.paceSeconds);

  if (workout.distanceKm) parts.push(`${workout.distanceKm} км`);
  if (time) parts.push(time);
  if (pace) parts.push(`${pace} /км`);
  if (workout.avgHeartRate) parts.push(`${workout.avgHeartRate} bpm`);
  if (workout.calories) parts.push(`${workout.calories} kcal`);
  if (workout.elevationM) parts.push(`+${workout.elevationM} м`);

  return parts;
}
