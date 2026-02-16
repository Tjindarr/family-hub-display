import { Thermometer, Droplets } from "lucide-react";
import type { TemperatureSensorData } from "@/hooks/useDashboardData";

interface TemperatureWidgetProps {
  sensors: TemperatureSensorData[];
  loading: boolean;
}

export default function TemperatureWidget({ sensors, loading }: TemperatureWidgetProps) {
  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="widget-card h-full flex flex-col gap-3">
      {sensors.map((sensor, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: sensor.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sensor.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Thermometer className="h-4 w-4" style={{ color: sensor.color }} />
              <span className="font-mono text-lg font-semibold text-foreground">
                {sensor.temperature !== null ? `${sensor.temperature.toFixed(1)}°` : "—"}
              </span>
            </div>
          </div>
          {sensor.humidity !== null && (
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-400" />
              <span className="font-mono text-sm text-muted-foreground">
                {sensor.humidity.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
