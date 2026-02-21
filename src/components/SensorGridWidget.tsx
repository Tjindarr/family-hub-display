import { Icon } from "@iconify/react";
import { ResponsiveContainer, ComposedChart, Line, Bar, Area, Scatter, YAxis } from "recharts";
import type { SensorGridConfig, SensorGridCellConfig, SensorGridVisibilityFilter, SensorChartType } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

function toIconName(name: string): string {
  if (name.includes(":")) return name;
  return `mdi:${name}`;
}

export interface SensorGridLiveData {
  values: { value: string; unit: string; history?: { time: string; value: number }[] }[];
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
  const vals = filter.exactValues || [];
  if (vals.length === 0) return true;
  return vals.some((v) => v === rawValue);
}

function CellChart({ history, color, chartType }: { history: { time: string; value: number }[]; color: string; chartType: SensorChartType }) {
  if (!history || history.length === 0) return null;
  const gradId = `sgGrad_${color.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.random().toString(36).slice(2, 6)}`;
  return (
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
          {chartType === "bar" && <Bar dataKey="value" fill={color} opacity={0.7} />}
          {chartType === "area" && <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />}
          {chartType === "step" && <Area type="stepAfter" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} />}
          {chartType === "scatter" && <Scatter dataKey="value" fill={color} />}
          {(chartType === "line" || !["bar", "area", "step", "scatter"].includes(chartType)) && (
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
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
          if (!cell.entityId) return <div key={i} style={{ order: cell.order ?? i }} />;
          const cellData = values[i];
          if (!isCellVisible(cell.visibilityFilter, cellData?.value)) return <div key={i} style={{ order: cell.order ?? i }} />;
          const { displayValue, icon, iconColor, valueColor } = resolveCell(cell, cellData?.value);
          return (
            <div
              key={i}
              className="relative flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/30 min-w-0 text-center overflow-hidden"
              style={{
                padding: "3px",
                gridColumn: cell.colSpan && cell.colSpan > 1 ? `span ${cell.colSpan}` : undefined,
                gridRow: cell.rowSpan && cell.rowSpan > 1 ? `span ${cell.rowSpan}` : undefined,
                order: cell.order ?? i,
              }}
            >
              {cell.showChart && cellData?.history && (
                <CellChart history={cellData.history} color={iconColor || "hsl(var(--primary))"} chartType={cell.chartType || "line"} />
              )}
              {icon && (
                <Icon
                  icon={toIconName(icon)}
                  className="shrink-0 relative z-10"
                  style={{ color: iconColor || undefined, width: cell.iconSize || 16, height: cell.iconSize || 16 }}
                />
              )}
              <span className="text-muted-foreground max-w-full text-center leading-tight break-words relative z-10" style={{ fontSize: cell.labelFontSize || fs.label }}>
                {cell.label}
              </span>
              <div className="flex items-baseline justify-center gap-0.5 relative z-10">
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
