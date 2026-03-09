import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartSeries } from "./types";

type ActionChartProps = {
  title: string;
  chartType: "bar" | "line" | "pie";
  series: ChartSeries[];
};

// Palette for series / pie slices
const COLOURS = [
  "#4f8ef7",
  "#34c97e",
  "#f7a234",
  "#e05c5c",
  "#a67df8",
  "#38bdf8",
  "#fb923c",
  "#4ade80",
];

/**
 * Merge multi-series data into the flat object array that recharts expects:
 *   [{ label: "Q1", Revenue: 120, Cost: 80 }, ...]
 */
function mergeSeriesData(series: ChartSeries[]): Record<string, string | number>[] {
  const labelMap: Record<string, Record<string, number>> = {};

  for (const s of series) {
    for (const point of s.data) {
      if (!labelMap[point.label]) labelMap[point.label] = {};
      labelMap[point.label][s.name] = point.value;
    }
  }

  return Object.entries(labelMap).map(([label, values]) => ({ label, ...values }));
}

export function ActionChart({ title, chartType, series }: ActionChartProps) {
  const isEmpty = !series || series.length === 0;

  return (
    <article className="action-card">
      <h4>{title}</h4>
      {isEmpty ? (
        <p className="chart-empty">No data provided.</p>
      ) : chartType === "pie" ? (
        <PieChartView series={series} />
      ) : chartType === "line" ? (
        <LineChartView series={series} />
      ) : (
        <BarChartView series={series} />
      )}
    </article>
  );
}

/* ---------- sub-views ---------- */

function BarChartView({ series }: { series: ChartSeries[] }) {
  const data = mergeSeriesData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #334)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => (
          <Bar key={s.name} dataKey={s.name} fill={COLOURS[i % COLOURS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ series }: { series: ChartSeries[] }) {
  const data = mergeSeriesData(series);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #334)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={COLOURS[i % COLOURS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ series }: { series: ChartSeries[] }) {
  // Flatten all series data into one pie; use first series if multi
  const slices = series[0]?.data ?? [];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry: { name?: string; percent?: number }) =>
            `${entry.name ?? ""} ${((entry.percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {slices.map((_, i) => (
            <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
