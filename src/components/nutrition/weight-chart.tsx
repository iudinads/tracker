import { WeightEntry } from "@/lib/types";

const Y_MIN = 48;
const Y_MAX = 58;
const TARGET_MIN = 51;
const TARGET_MAX = 53;

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 16;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 36;

function weightToY(weight: number): number {
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const normalized = (weight - Y_MIN) / (Y_MAX - Y_MIN);
  return PADDING_TOP + plotHeight - normalized * plotHeight;
}

function formatChartDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface WeightChartProps {
  entries: WeightEntry[];
}

export function WeightChart({ entries }: WeightChartProps) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 py-12 text-center text-xs text-neutral-400">
        Добавьте первое измерение, чтобы увидеть график
      </div>
    );
  }

  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const points = sorted.map((entry, i) => {
    const x =
      sorted.length === 1
        ? PADDING_LEFT + plotWidth / 2
        : PADDING_LEFT + (i / (sorted.length - 1)) * plotWidth;
    const y = weightToY(entry.weight);
    return { x, y, entry };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const targetYTop = weightToY(TARGET_MAX);
  const targetYBottom = weightToY(TARGET_MIN);
  const targetHeight = targetYBottom - targetYTop;

  const yTicks = [48, 50, 52, 54, 56, 58];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x={PADDING_LEFT}
          y={targetYTop}
          width={plotWidth}
          height={targetHeight}
          fill="#d1fae5"
          opacity={0.6}
        />

        {yTicks.map((tick) => {
          const y = weightToY(tick);
          return (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={PADDING_LEFT + plotWidth}
                y2={y}
                stroke="#f5f5f5"
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-neutral-400"
                fontSize={10}
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + plotHeight}
          x2={PADDING_LEFT + plotWidth}
          y2={PADDING_TOP + plotHeight}
          stroke="#e5e5e5"
          strokeWidth={1}
        />

        {sorted.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="#171717"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {points.map((p) => (
          <g key={p.entry.id}>
            <circle cx={p.x} cy={p.y} r={4} fill="#171717" />
            <text
              x={p.x}
              y={PADDING_TOP + plotHeight + 16}
              textAnchor="middle"
              className="fill-neutral-500"
              fontSize={9}
            >
              {formatChartDate(p.entry.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
