import { Icon } from "@iconify/react";
import type { VehicleLiveData, VehicleEntityData } from "@/hooks/useVehicleData";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface VehicleWidgetProps {
  data: VehicleLiveData;
  loading: boolean;
  fontSizes?: ResolvedFontSizes;
}

/** Render a progress-style bar for battery/fuel percentage values */
function PercentBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getBarColor(value: number): string {
  if (value >= 60) return "hsl(120, 50%, 50%)";
  if (value >= 30) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

function getDoorLockColor(value: string): string {
  const v = value.toLowerCase();
  if (v === "locked" || v === "on" || v === "true" || v === "closed") return "hsl(120, 50%, 50%)";
  if (v === "unlocked" || v === "off" || v === "false" || v === "open") return "hsl(0, 72%, 55%)";
  return "hsl(var(--muted-foreground))";
}

function formatDoorValue(value: string): string {
  const v = value.toLowerCase();
  if (v === "on" || v === "true") return "Locked";
  if (v === "off" || v === "false") return "Unlocked";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function EntityRow({ entity, sectionType, fs }: { entity: VehicleEntityData; sectionType: string; fs: ResolvedFontSizes }) {
  const isBatteryFuel = sectionType === "battery" || sectionType === "fuel";
  const isDoorLock = sectionType === "doors";
  const showBar = isBatteryFuel && entity.numericValue !== null;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon
            icon={entity.icon.includes(":") ? entity.icon : `mdi:${entity.icon}`}
            className="shrink-0"
            style={{ color: isDoorLock ? getDoorLockColor(entity.value) : entity.color, fontSize: 16 }}
          />
          <span className="text-muted-foreground truncate" style={{ fontSize: fs.label }}>
            {entity.label}
          </span>
        </div>
        <span
          className="font-medium whitespace-nowrap"
          style={{
            fontSize: fs.body,
            color: isDoorLock ? getDoorLockColor(entity.value) : "hsl(var(--foreground))",
          }}
        >
          {isDoorLock ? formatDoorValue(entity.value) : entity.value}
          {!isDoorLock && entity.unit && (
            <span className="text-muted-foreground ml-0.5" style={{ fontSize: fs.label }}>
              {entity.unit}
            </span>
          )}
        </span>
      </div>
      {showBar && (
        <PercentBar
          value={entity.numericValue!}
          color={entity.color || getBarColor(entity.numericValue!)}
        />
      )}
    </div>
  );
}

export default function VehicleWidget({ data, loading, fontSizes }: VehicleWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };

  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="widget-card h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon
          icon={data.icon.includes(":") ? data.icon : `mdi:${data.icon}`}
          className="text-primary shrink-0"
          style={{ fontSize: fs.value }}
        />
        <span className="font-semibold text-foreground truncate" style={{ fontSize: fs.heading }}>
          {data.name.toUpperCase()}
        </span>
      </div>

      {/* Sections */}
      <div className="flex-1 grid gap-3" style={{
        gridTemplateColumns: data.sections.length > 2
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(1, minmax(0, 1fr))",
      }}>
        {data.sections.map((section) => (
          <div key={section.id} className="space-y-1.5">
            <span
              className="text-muted-foreground uppercase tracking-wider block"
              style={{ fontSize: Math.max(fs.label - 1, 8) }}
            >
              {section.label}
            </span>
            <div className="space-y-1">
              {section.entities.map((entity) => (
                <EntityRow
                  key={entity.entityId}
                  entity={entity}
                  sectionType={section.type}
                  fs={fs}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
