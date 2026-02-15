import { MapPin, Battery, BatteryCharging, Navigation } from "lucide-react";

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

      {/* Attributes - left-aligned */}
      <div className="flex flex-col justify-center gap-1.5 sm:gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
          <span className="text-sm sm:text-base text-foreground truncate">{person.location ?? "—"}</span>
        </div>

        <div className="flex items-center gap-2">
          {person.isCharging ? (
            <BatteryCharging className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: batteryColor }} />
          ) : (
            <Battery className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: batteryColor }} />
          )}
          {person.batteryPercent !== null ? (
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
