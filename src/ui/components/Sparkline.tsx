// Tiny dependency-free SVG sparkline (the web equivalent of the CLI's box-
// drawing line chart). Draws a rating series as a single polyline with a dot at
// the latest point. Scales to its container via viewBox + preserveAspectRatio.

interface SparklineProps {
  series: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  series,
  width = 240,
  height = 56,
  className,
}: SparklineProps) {
  if (series.length < 2) {
    return (
      <div className={className}>
        <span className="text-xs text-slate-500">not enough games</span>
      </div>
    );
  }

  const pad = 3;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1; // flat line -> avoid /0
  const stepX = (width - pad * 2) / (series.length - 1);

  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - lo) / span);

  const points = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = series.length - 1;
  const rising = series[last] >= series[0];
  const stroke = rising ? "#34d399" : "#f87171"; // emerald / red

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Rating trend, ${series.length} points, ${rising ? "up" : "down"}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(last)} cy={y(series[last])} r={2.5} fill={stroke} />
    </svg>
  );
}
