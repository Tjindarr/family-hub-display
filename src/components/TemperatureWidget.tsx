import { Thermometer, Droplets } from "lucide-react";
import type { TemperatureSensorData } from "@/hooks/useDashboardData";

interface TemperatureWidgetProps {
  sensor: TemperatureSensorData;
  loading: boolean;
}

export default function TemperatureWidget({ sensor, loading }: TemperatureWidgetProps) {
  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="widget-card h-full">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sensor.color }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {sensor.label}
        </h3>
      </div>

      <div className="flex items-end gap-4">
        {/* Temperature */}
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" style={{ color: sensor.color }} />
          <span className="font-mono text-2xl font-semibold text-foreground">
            {sensor.temperature !== null ? `${sensor.temperature.toFixed(1)}°` : "—"}
          </span>
        </div>

        {/* Humidity (only if configured and available) */}
        {sensor.humidity !== null && (
          <div className="flex items-center gap-1.5 pb-0.5">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span className="font-mono text-sm text-muted-foreground">
              {sensor.humidity.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
