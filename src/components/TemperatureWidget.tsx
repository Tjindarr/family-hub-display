import { Thermometer, Droplets } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Line, Bar, Area, Scatter, YAxis } from "recharts";
import type { TemperatureSensorData } from "@/hooks/useDashboardData";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface TemperatureWidgetProps {
  sensors: TemperatureSensorData[];
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
}

function SensorChart({ sensor }: { sensor: TemperatureSensorData }) {
  if (!sensor.showChart || !sensor.history || sensor.history.length === 0) return null;

  const chartType = sensor.chartType || "line";
  const color = sensor.color;

  return (
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={sensor.history} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={`tempGrad_${sensor.entityId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
          {chartType === "bar" && <Bar dataKey="value" fill={color} opacity={0.7} />}
          {chartType === "area" && (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#tempGrad_${sensor.entityId})`}
              dot={false}
            />
          )}
          {chartType === "step" && (
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#tempGrad_${sensor.entityId})`}
              dot={false}
            />
          )}
          {chartType === "scatter" && <Scatter dataKey="value" fill={color} />}
          {(chartType === "line" || !["bar", "area", "step", "scatter"].includes(chartType)) && (
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TemperatureWidget({ sensors, loading, fontSizes }: TemperatureWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="widget-card h-full flex flex-col gap-1">
      {sensors.map((sensor, i) => {
        const iconPx = sensor.iconSize || 16;
        return (
          <div key={i} className="relative overflow-hidden rounded-lg">
            <SensorChart sensor={sensor} />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: sensor.color }} />
                  <span
                    className="font-semibold uppercase tracking-wider text-muted-foreground"
                    style={{ fontSize: sensor.labelTextSize || fs.heading, color: sensor.labelColor || undefined }}
                  >
                    {sensor.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Thermometer style={{ color: sensor.iconColor || sensor.color, width: iconPx, height: iconPx }} />
                  <span className="font-mono font-semibold text-foreground" style={{ fontSize: sensor.valueTextSize || fs.value, color: sensor.valueColor || undefined }}>
                    {sensor.temperature !== null
                      ? `${sensor.roundTemperature ? Math.round(sensor.temperature) : sensor.temperature.toFixed(1)}°`
                      : "—"}
                  </span>
                </div>
              </div>
              {sensor.humidity !== null && (
                <div className="flex items-center gap-1.5">
                  <Droplets style={{ color: sensor.secondaryIconColor || "hsl(210, 80%, 65%)", width: iconPx, height: iconPx }} />
                  <span className="font-mono text-muted-foreground" style={{ fontSize: sensor.humidityTextSize || fs.body, color: sensor.labelColor || undefined }}>
                    {sensor.humidity.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
