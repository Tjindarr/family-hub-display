import { lazy, Suspense, useMemo } from "react";
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Scatter,
} from "recharts";
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { GeneralSensorConfig, SensorChartType } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

// Dynamic icon loader
interface DynIconProps extends Omit<LucideProps, "ref"> {
  name: string;
}

const iconCache: Record<string, React.ComponentType<Omit<LucideProps, "ref">>> = {};

function DynIcon({ name, ...props }: DynIconProps) {
  const key = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[key]) {
    return <span className="h-5 w-5" />;
  }
  if (!iconCache[name]) {
    iconCache[name] = lazy(dynamicIconImports[key]);
  }
  const LucideIcon = iconCache[name];
  return (
    <Suspense fallback={<span className="h-5 w-5" />}>
      <LucideIcon {...props} />
    </Suspense>
  );
}

export interface GeneralSensorLiveData {
  topValues: { label: string; value: string; unit: string; color: string }[];
  bottomValues: { label: string; value: string; unit: string; color: string }[];
  chartData: Record<string, number | string>[];
  chartSeriesMeta: { dataKey: string; label: string; color: string; chartType: SensorChartType }[];
}

interface GeneralSensorWidgetProps {
  config: GeneralSensorConfig;
  data: GeneralSensorLiveData;
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
}

function formatTickByGrouping(iso: string, grouping?: string): string {
  try {
    const d = new Date(iso);
    if (grouping === "day") {
      return d.toLocaleDateString("sv-SE", { month: "2-digit", day: "2-digit" });
    }
    if (grouping === "minute") {
      return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

export default function GeneralSensorWidget({ config, data, loading, fontSizes }: GeneralSensorWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
  const iconPx = config.iconSize || 20;
  const { topValues, bottomValues, chartData, chartSeriesMeta } = data || { topValues: [], bottomValues: [], chartData: [], chartSeriesMeta: [] };

  // Compute stats per series
  const seriesStats = useMemo(() => {
    return chartSeriesMeta.map((s) => {
      const vals = chartData.map((d) => d[s.dataKey]).filter((v): v is number => typeof v === "number");
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      return { ...s, avg, min, max };
    });
  }, [chartData, chartSeriesMeta]);

  // Chart ticks — show ~8 ticks
  const ticks = useMemo(() => {
    if (chartData.length <= 8) return chartData.map((d) => d.time as string);
    const step = Math.max(1, Math.floor(chartData.length / 8));
    return chartData.filter((_, i) => i % step === 0).map((d) => d.time as string);
  }, [chartData]);

  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  return (
    <div className="widget-card h-full flex flex-col">
      {/* Header: icon + label */}
      <div className="flex items-center gap-3 mb-2">
        {config.icon && (
          <DynIcon name={config.icon} style={{ width: iconPx, height: iconPx }} className="text-primary shrink-0" />
        )}
        {config.showLabel && config.label && (
          <span className="font-medium text-foreground" style={{ fontSize: fs.body }}>{config.label}</span>
        )}
      </div>

      {/* Top info values */}
      {topValues.length > 0 && (
        <div className="flex items-baseline gap-4 mb-3 flex-wrap">
          {topValues.map((tv, i) => (
            <div key={i} className="flex items-baseline gap-1">
              <span className="font-mono font-bold" style={{ color: tv.color || undefined, fontSize: fs.value }}>
                {tv.value}
              </span>
              {tv.unit && <span className="text-muted-foreground" style={{ fontSize: fs.label }}>{tv.unit}</span>}
              {tv.label && <span className="text-muted-foreground" style={{ fontSize: fs.label }}>{tv.label}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {config.showGraph && chartData.length > 0 && chartSeriesMeta.length > 0 && (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={120}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                {chartSeriesMeta.map((s) => (
                  <linearGradient key={`grad_${s.dataKey}`} id={`grad_${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
              <XAxis
                dataKey="time"
                ticks={ticks}
                tickFormatter={(v) => formatTickByGrouping(v, config.chartGrouping)}
                tick={{ fill: "hsl(215, 12%, 55%)", fontSize: fs.label }}
                axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
              />
              <YAxis
                tick={{ fill: "hsl(215, 12%, 55%)", fontSize: fs.label }}
                axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 13%)",
                  border: "1px solid hsl(220, 14%, 20%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 92%)",
                  fontSize: fs.body,
                }}
                labelFormatter={(v) => {
                  const d = new Date(String(v));
                  if (config.chartGrouping === "day") return d.toLocaleDateString("sv-SE");
                  return d.toLocaleDateString("sv-SE") + " " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
                }}
              />
              {chartSeriesMeta.map((s) => {
                switch (s.chartType) {
                  case "bar":
                    return <Bar key={s.dataKey} dataKey={s.dataKey} fill={s.color} opacity={0.8} name={s.label} />;
                  case "area":
                    return <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} fill={`url(#grad_${s.dataKey})`} dot={false} name={s.label} />;
                  case "step":
                    return <Area key={s.dataKey} type="stepAfter" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} fill={`url(#grad_${s.dataKey})`} dot={false} name={s.label} />;
                  case "scatter":
                    return <Scatter key={s.dataKey} dataKey={s.dataKey} fill={s.color} name={s.label} />;
                  case "line":
                  default:
                    return <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} stroke={s.color} strokeWidth={2} dot={false} name={s.label} />;
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom info values */}
      {bottomValues.length > 0 && (
        <div className="mt-2 flex gap-4 flex-wrap" style={{ fontSize: fs.label }}>
          {bottomValues.map((bv, i) => (
            <div key={i} className="flex items-baseline gap-1">
              {bv.label && <span className="text-muted-foreground">{bv.label}</span>}
              <span className="font-mono font-medium" style={{ color: bv.color || undefined }}>
                {bv.value}
              </span>
              {bv.unit && <span className="text-muted-foreground">{bv.unit}</span>}
            </div>
          ))}
          {seriesStats.length > 0 && (
            <div className="ml-auto flex gap-3">
              <div>
                <span className="text-muted-foreground">Avg </span>
                <span className="font-mono font-medium text-foreground">{seriesStats[0].avg.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Min </span>
                <span className="font-mono font-medium" style={{ color: "hsl(120, 50%, 50%)" }}>{seriesStats[0].min.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max </span>
                <span className="font-mono font-medium" style={{ color: "hsl(0, 72%, 55%)" }}>{seriesStats[0].max.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
