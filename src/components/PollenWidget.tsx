import { Flower2 } from "lucide-react";
import { Icon } from "@iconify/react";
import type { PollenData, PollenLevel } from "@/hooks/usePollenData";
import type { PollenConfig } from "@/lib/config";

interface PollenWidgetProps {
  data: PollenData;
  loading: boolean;
  pollenConfig?: PollenConfig;
}

const LEVEL_COLORS: Record<number, string> = {
  [-1]: "hsl(var(--muted-foreground))",
  0: "hsl(120, 40%, 45%)",    // green - none
  1: "hsl(80, 50%, 50%)",     // yellow-green - low
  2: "hsl(50, 70%, 50%)",     // yellow - low-moderate
  3: "hsl(35, 80%, 50%)",     // orange - moderate
  4: "hsl(20, 85%, 50%)",     // dark orange - moderate-high
  5: "hsl(0, 70%, 50%)",      // red - high
  6: "hsl(330, 70%, 45%)",    // dark red - very high
};

const LEVEL_LABELS: Record<number, string> = {
  [-1]: "N/A",
  0: "Inga",
  1: "Låga",
  2: "Låga-Måttliga",
  3: "Måttliga",
  4: "Måttliga-Höga",
  5: "Höga",
  6: "Mycket höga",
};

function getLevelColor(level: number): string {
  return LEVEL_COLORS[level] || LEVEL_COLORS[-1];
}

function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] || "Okänd";
}

function LevelDot({ level, size = 10 }: { level: number; size?: number }) {
  return (
    <div
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: getLevelColor(level),
      }}
    />
  );
}

function PollenSensorRow({ sensor, showForecast, iconSize, labelSize, valueSize }: {
  sensor: PollenLevel;
  showForecast: boolean;
  iconSize: number;
  labelSize: number;
  valueSize: number;
}) {
  const iconName = sensor.icon.startsWith("mdi:") ? sensor.icon : `mdi:${sensor.icon}`;

  return (
    <div className="flex items-center gap-2">
      <Icon
        icon={iconName}
        width={iconSize}
        height={iconSize}
        style={{ color: sensor.color || "hsl(var(--foreground))" }}
        className="shrink-0"
      />
      <span
        className="font-medium truncate min-w-0"
        style={{ fontSize: labelSize, color: "hsl(var(--foreground))" }}
      >
        {sensor.label}
      </span>
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <LevelDot level={sensor.numericState} size={8} />
        <span
          className="text-right whitespace-nowrap"
          style={{
            fontSize: valueSize,
            color: getLevelColor(sensor.numericState),
          }}
        >
          {sensor.numericState >= 0 ? getLevelLabel(sensor.numericState) : sensor.state}
        </span>
      </div>
      {showForecast && sensor.forecast.length > 0 && (
        <div className="flex gap-1 shrink-0 ml-1">
          {sensor.forecast.map((f, i) => (
            <LevelDot key={i} level={f.numericLevel} size={6} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PollenWidget({ data, loading, pollenConfig }: PollenWidgetProps) {
  const iconSize = pollenConfig?.iconSize || 18;
  const labelSize = pollenConfig?.labelFontSize || 13;
  const valueSize = pollenConfig?.valueFontSize || 12;
  const showLabel = pollenConfig?.showLabel !== false;
  const showForecast = pollenConfig?.showForecast !== false;

  if (loading) {
    return (
      <div className="widget-card h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading pollen data…</div>
      </div>
    );
  }

  if (data.sensors.length === 0) {
    return (
      <div className="widget-card h-full flex items-center justify-center text-muted-foreground text-sm">
        No pollen sensors configured
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-1.5 p-1">
      {showLabel && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <Flower2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span
            className="font-semibold uppercase tracking-wider"
            style={{ fontSize: pollenConfig?.headingFontSize || 10, color: pollenConfig?.headingColor || "hsl(var(--primary))" }}
          >
            Pollen
          </span>
          {showForecast && data.sensors[0]?.forecast.length > 0 && (
            <div className="flex gap-1 ml-auto items-center">
              {data.sensors[0].forecast.map((f, i) => (
                <span key={i} className="text-[9px] text-muted-foreground">
                  {f.date ? new Date(f.date).toLocaleDateString("sv-SE", { weekday: "short" }).slice(0, 2) : `+${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {data.sensors.map((sensor) => (
          <PollenSensorRow
            key={sensor.entityId}
            sensor={sensor}
            showForecast={showForecast}
            iconSize={iconSize}
            labelSize={labelSize}
            valueSize={valueSize}
          />
        ))}
      </div>
    </div>
  );
}
