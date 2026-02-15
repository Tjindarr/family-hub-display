import { MapPin, Navigation } from "lucide-react";

export interface PersonData {
  name: string;
  pictureUrl: string | null;
  location: string | null;
  batteryPercent: number | null;
  isCharging: boolean;
  distanceKm: number | null;
}

interface PersonWidgetProps {
  person: PersonData;
  loading: boolean;
}

function getBatteryColor(percent: number): string {
  if (percent >= 60) return "hsl(120, 50%, 50%)";
  if (percent >= 30) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

function getBatteryBg(percent: number): string {
  if (percent >= 60) return "hsl(120 50% 50% / 0.15)";
  if (percent >= 30) return "hsl(32 95% 55% / 0.15)";
  return "hsl(0 72% 55% / 0.15)";
}

function BatteryIcon({ percent, isCharging, color }: { percent: number; isCharging: boolean; color: string }) {
  // 4 bars max
  const bars = Math.round((percent / 100) * 4);
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="shrink-0">
      {/* Battery body */}
      <rect x="0.5" y="0.5" width="16" height="11" rx="2" stroke={color} strokeWidth="1" fill="none" />
      {/* Battery tip */}
      <rect x="17" y="3" width="2.5" height="6" rx="1" fill={color} opacity="0.6" />
      {/* Bars */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={2 + i * 3.7}
          y="2.5"
          width="2.8"
          height="7"
          rx="0.5"
          fill={i < bars ? color : "transparent"}
          opacity={i < bars ? 0.9 : 0.15}
          stroke={i >= bars ? color : "none"}
          strokeWidth={i >= bars ? 0.3 : 0}
        />
      ))}
      {/* Charging bolt */}
      {isCharging && (
        <polygon points="9,1 6,6.5 9,6.5 8,11 12,5.5 9,5.5 10,1" fill={color} opacity="0.9" />
      )}
    </svg>
  );
}

export default function PersonWidget({ person, loading }: PersonWidgetProps) {
  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const batteryColor = person.batteryPercent !== null ? getBatteryColor(person.batteryPercent) : undefined;
  const batteryBg = person.batteryPercent !== null ? getBatteryBg(person.batteryPercent) : undefined;

  return (
    <div className="widget-card h-full flex items-center gap-3 sm:gap-4">
      {/* Avatar - constrained size */}
      <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 border-border bg-muted">
        {person.pictureUrl ? (
          <img
            src={person.pictureUrl}
            alt={person.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl sm:text-2xl font-semibold text-muted-foreground">
            {person.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Attributes */}
      <div className="flex flex-col justify-center gap-1.5 sm:gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
          <span className="text-sm sm:text-base text-foreground truncate">{person.location ?? "—"}</span>
        </div>

        <div className="flex items-center gap-2">
          {person.batteryPercent !== null && batteryColor ? (
            <>
              <BatteryIcon percent={person.batteryPercent} isCharging={person.isCharging} color={batteryColor} />
              <div className="flex items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-xs sm:text-sm font-medium"
                  style={{ backgroundColor: batteryBg, color: batteryColor }}
                >
                  {Math.round(person.batteryPercent)}%
                </span>
                {person.isCharging && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Charging</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm sm:text-base text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-accent" />
          <span className="text-sm sm:text-base text-foreground">
            {person.distanceKm !== null ? `${person.distanceKm.toFixed(1)} km` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
