"use client";

import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";

// House style (CLAUDE.md, DASHBOARD.md §2): one colour per series, hairline solid grid, no rounded
// bars, numbers in tabular figures. Every chart has a table next to it with the same values, so a
// tooltip is never the only way to read one.

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };
const tick = { ...axis, fontVariantNumeric: "tabular-nums" };
const height = (rows: number) => Math.max(120, rows * 40 + 40);

export type DimensionPoint = { name: string; mean: number; sd: number | null };

/** A plain tooltip: the row's name and the lines given, nothing Recharts adds on its own. */
function Tip({ active, payload, lines }: { active?: boolean; payload?: readonly { payload?: Record<string, unknown> }[]; lines: (row: Record<string, unknown>) => string[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs tabular-nums">
      <p className="font-semibold">{String(row.name)}</p>
      {lines(row).map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

/**
 * Point and whisker per dimension: the point is the mean, the whisker ±1 standard deviation
 * (clipped to 0–100). The whisker is a thin stacked bar, so rows align with their labels.
 */
export function DimensionChart({ data }: { data: DimensionPoint[] }) {
  const rows = data.map((d) => {
    const lo = Math.max(0, d.mean - (d.sd ?? 0));
    const hi = Math.min(100, d.mean + (d.sd ?? 0));
    return { ...d, start: lo, span: hi - lo };
  });
  return (
    <div role="img" aria-label="Dimension scores with their spread. The table below has the same values." style={{ height: height(rows.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart layout="vertical" data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={tick} stroke="var(--chart-grid)" />
          <YAxis type="category" dataKey="name" width={170} tick={axis} stroke="var(--chart-grid)" />
          <Tooltip
            cursor={false}
            content={(p) => <Tip {...p} lines={(r) => [`Mean ${Number(r.mean).toFixed(1)}`, r.sd === null ? "One response" : `Spread ±${Number(r.sd).toFixed(1)}`]} />}
          />
          <Bar dataKey="start" stackId="whisker" fill="transparent" barSize={2} isAnimationActive={false} />
          <Bar dataKey="span" stackId="whisker" fill="var(--chart-1)" barSize={2} isAnimationActive={false} />
          <Scatter dataKey="mean" name="Mean" fill="var(--chart-1)" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type GapPoint = { name: string; leadership: number; frontline: number };

/** Dumbbell per dimension: frontline and leadership means, one hue in two shades, joined by a line. */
export function GapChart({ data }: { data: GapPoint[] }) {
  const rows = data.map((d) => ({ ...d, start: Math.min(d.leadership, d.frontline), span: Math.abs(d.leadership - d.frontline) }));
  return (
    <div role="img" aria-label="Leadership and frontline scores per dimension. The table below has the same values." style={{ height: height(rows.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart layout="vertical" data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={tick} stroke="var(--chart-grid)" />
          <YAxis type="category" dataKey="name" width={170} tick={axis} stroke="var(--chart-grid)" />
          {/* The connector: an invisible bar up to the lower point, then a thin one across the gap. */}
          <Tooltip
            cursor={false}
            content={(p) => <Tip {...p} lines={(r) => [`Frontline ${Number(r.frontline).toFixed(1)}`, `Leadership ${Number(r.leadership).toFixed(1)}`]} />}
          />
          <Bar dataKey="start" stackId="gap" fill="transparent" barSize={2} isAnimationActive={false} />
          <Bar dataKey="span" stackId="gap" fill="var(--muted-foreground)" barSize={2} isAnimationActive={false} />
          <Scatter dataKey="frontline" name="Frontline" fill="var(--chart-2)" isAnimationActive={false} />
          <Scatter dataKey="leadership" name="Leadership" fill="var(--chart-1)" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
