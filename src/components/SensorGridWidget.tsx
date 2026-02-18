import { Icon } from "@iconify/react";
import type { SensorGridConfig, SensorGridCellConfig } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

function toIconName(name: string): string {
  if (name.includes(":")) return name;
  return `mdi:${name}`;
}

export interface SensorGridLiveData {
  values: { value: string; unit: string }[];
}

interface SensorGridWidgetProps {
  config: SensorGridConfig;
  data: SensorGridLiveData | undefined;
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
}

function resolveCell(cell: SensorGridCellConfig, rawValue: string | undefined) {
  let displayValue = rawValue ?? "—";
  let icon = cell.icon;
  let iconColor = cell.color;
  let valueColor = cell.valueColor || cell.color;

  // Apply value mapping
  if (cell.valueMaps?.length && rawValue != null) {
    const match = cell.valueMaps.find((m) => m.from === rawValue);
    if (match) displayValue = match.to;
  }

  // Apply interval-based icon/color
  if (cell.useIntervals && cell.intervals?.length && rawValue != null) {
    const num = parseFloat(rawValue);
    if (!isNaN(num)) {
      const matched = cell.intervals.find((iv) => num >= iv.min && num <= iv.max);
      if (matched) {
        icon = matched.icon || icon;
        iconColor = matched.color || iconColor;
        valueColor = matched.color || valueColor;
      }
    }
  }

  return { displayValue, icon, iconColor, valueColor };
}

export default function SensorGridWidget({ config, data, loading, fontSizes }: SensorGridWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const values = data?.values || [];

  return (
    <div className="widget-card h-full flex flex-col">
      <div
        className="flex-1 grid gap-2 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
        }}
      >
        {config.cells.map((cell, i) => {
          if (!cell.entityId) return <div key={i} />;
          const cellData = values[i];
          const { displayValue, icon, iconColor, valueColor } = resolveCell(cell, cellData?.value);
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/30 p-2 min-w-0 text-center"
            >
              {icon && (
                <Icon
                  icon={toIconName(icon)}
                  className="shrink-0"
                  style={{ color: iconColor || undefined, width: cell.iconSize || 16, height: cell.iconSize || 16 }}
                />
              )}
              <span className="text-muted-foreground max-w-full text-center leading-tight break-words" style={{ fontSize: cell.labelFontSize || fs.label }}>
                {cell.label}
              </span>
              <div className="flex items-baseline justify-center gap-0.5">
                <span
                  className="font-mono font-semibold text-center"
                  style={{ color: valueColor || undefined, fontSize: cell.fontSize || fs.body }}
                >
                  {displayValue}
                </span>
                {cellData?.unit && (
                  <span className="text-muted-foreground" style={{ fontSize: cell.labelFontSize || fs.label }}>{cellData.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
