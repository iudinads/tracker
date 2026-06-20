import { getNutrientStatus, statusColors } from "@/lib/nutrition-utils";

interface ProgressRingProps {
  label: string;
  actual: number;
  goal: number;
  unit?: string;
}

export function ProgressRing({ label, actual, goal, unit = "" }: ProgressRingProps) {
  const status = getNutrientStatus(actual, goal);
  const color = statusColors[status];
  const radius = 32;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = goal > 0 ? Math.min(actual / goal, 1) : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            stroke="#e5e5e5"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium text-neutral-600">
            {Math.round(actual)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-neutral-700">{label}</p>
        <p className="text-[10px] text-neutral-400">
          / {goal}
          {unit}
        </p>
      </div>
    </div>
  );
}
