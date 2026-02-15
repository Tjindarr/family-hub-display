import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Thermometer } from "lucide-react";
import type { TemperatureSeries } from "@/hooks/useDashboardData";

interface TemperatureWidgetProps {
  series: TemperatureSeries[];
  loading: boolean;
}

export default function TemperatureWidget({ series, loading }: TemperatureWidgetProps) {
  // Merge all series into a single dataset
  const merged: Record<string, any>[] = [];
  if (series.length > 0) {
    const maxLen = Math.max(...series.map((s) => s.data.length));
    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, any> = { time: series[0]?.data[i]?.time || "" };
      series.forEach((s) => {
        if (s.data[i]) point[s.label] = +s.data[i].value.toFixed(1);
      });
      merged.push(point);
    }
  }

  // Show every 4th label
  const tickInterval = Math.max(1, Math.floor(merged.length / 6));

  return (
    <div className="widget-card h-full">
      <div className="mb-4 flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Temperature (24h)
        </h3>
      </div>

      {loading ? (
        <div className="h-[250px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={merged} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              interval={tickInterval}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
              unit="°"
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 13%)",
                border: "1px solid hsl(220, 14%, 20%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 92%)",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "hsl(215, 12%, 55%)" }}
            />
            {series.map((s) => (
              <Line
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Current values */}
      {!loading && series.length > 0 && (
        <div className="mt-3 flex gap-4 flex-wrap">
          {series.map((s) => {
            const latest = s.data[s.data.length - 1];
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {latest?.value.toFixed(1)}°
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
