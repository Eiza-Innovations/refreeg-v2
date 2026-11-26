import { cn } from "@/lib/utils";

const WIDTH = 96;
const HEIGHT = 24;

/** Daily totals as a tiny line: green when the last week beat the week before, rust when it went quiet. */
export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const half = Math.floor(values.length / 2);
  const sum = (part: number[]) =>
    part.reduce((total, value) => total + value, 0);
  const recent = sum(values.slice(half));
  const tone =
    recent === 0
      ? "text-rust"
      : recent >= sum(values.slice(0, half))
        ? "text-forest"
        : "text-gold";
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * WIDTH;
      const y = HEIGHT - 2 - (value / max) * (HEIGHT - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("overflow-visible", tone)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
