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
import type { ReactNode } from "react";
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

const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 4 };
const AXIS_TICK = { fontSize: 12 };

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
  const pointCount = Math.max(0, ...series.map((s) => s.data.length));
  const minChartWidth = chartType === "pie" ? 420 : Math.max(560, pointCount * 84);

  return (
    <article className="action-card">
      <h4>{title}</h4>
      {isEmpty ? (
        <p className="chart-empty">No data provided.</p>
      ) : (
        <div className="chart-scroll-wrap">
          <div className="chart-canvas" style={{ minWidth: `${minChartWidth}px` }}>
            {chartType === "pie" ? (
              <PieChartView series={series} />
            ) : chartType === "line" ? (
              <LineChartView series={series} />
            ) : (
              <BarChartView series={series} />
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* ---------- sub-views ---------- */

function ChartContainer({ children }: { children: ReactNode }) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      {children}
    </ResponsiveContainer>
  );
}

function CartesianFrame({ showLegend }: { showLegend: boolean }) {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #334)" />
      <XAxis dataKey="label" tick={AXIS_TICK} />
      <YAxis tick={AXIS_TICK} />
      <Tooltip />
      {showLegend ? <Legend /> : null}
    </>
  );
}

function BarChartView({ series }: { series: ChartSeries[] }) {
  const data = mergeSeriesData(series);
  return (
    <ChartContainer>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianFrame showLegend={series.length > 1} />
        {series.map((s, i) => (
          <Bar key={s.name} dataKey={s.name} fill={COLOURS[i % COLOURS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function LineChartView({ series }: { series: ChartSeries[] }) {
  const data = mergeSeriesData(series);
  return (
    <ChartContainer>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianFrame showLegend={series.length > 1} />
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
    </ChartContainer>
  );
}

function PieChartView({ series }: { series: ChartSeries[] }) {
  // Flatten all series data into one pie; use first series if multi
  const slices = series[0]?.data ?? [];
  return (
    <ChartContainer>
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
    </ChartContainer>
  );
}
