import { Icon } from "@iconify/react";
import type { SensorGridConfig, SensorGridCellConfig, SensorGridVisibilityFilter } from "@/lib/config";
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
    if (match) {
      displayValue = match.to;
      if (match.icon) icon = match.icon;
      if (match.color) {
        iconColor = match.color;
        valueColor = match.color;
      }
    }
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

function isCellVisible(filter: SensorGridVisibilityFilter | undefined, rawValue: string | undefined): boolean {
  if (!filter?.enabled || rawValue == null) return true;
  if (filter.mode === "range") {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return false;
    const min = filter.rangeMin ?? -Infinity;
    const max = filter.rangeMax ?? Infinity;
    return num >= min && num <= max;
  }
  // exact match
  const vals = filter.exactValues || [];
  if (vals.length === 0) return true;
  return vals.some((v) => v === rawValue);
}

export default function SensorGridWidget({ config, data, loading, fontSizes }: SensorGridWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const values = data?.values || [];

  return (
    <div className="widget-card h-full flex flex-col" style={{ paddingTop: "calc(var(--widget-padding, 12px) - 5px)", paddingBottom: "calc(var(--widget-padding, 12px) - 5px)" }}>
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
          if (!isCellVisible(cell.visibilityFilter, cellData?.value)) return <div key={i} />;
          const { displayValue, icon, iconColor, valueColor } = resolveCell(cell, cellData?.value);
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/30 min-w-0 text-center"
              style={{ padding: "3px" }}
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
