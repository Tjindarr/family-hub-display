import { Plug, PlugZap, Fuel, Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";
import type { CarChargerData } from "@/components/CarChargerWidget";
import type { CarFuelData } from "@/components/CarFuelWidget";
import type { CarBatteryData } from "@/components/CarBatteryWidget";

interface CarWidgetProps {
  charger: CarChargerData;
  fuel: CarFuelData;
  battery: CarBatteryData;
  loading: boolean;
}

function getStatusLabel(state: string): string {
  switch (state) {
    case "disconnected": return "Ej inkopplad";
    case "charging": return "Laddar";
    case "ready_to_charge": return "Redo att ladda";
    case "awaiting_start": return "Väntar";
    case "completed": return "Laddad";
    default: return "Inkopplad";
  }
}

function getStatusColor(state: string): string {
  if (state === "disconnected") return "hsl(8, 72%, 45%)";
  return "hsl(120, 50%, 50%)";
}

function getFuelColor(km: number): string {
  if (km < 100) return "hsl(0, 72%, 50%)";
  if (km < 280) return "hsl(32, 95%, 55%)";
  return "hsl(140, 50%, 45%)";
}

function getBatteryColor(pct: number): string {
  if (pct < 30) return "hsl(0, 72%, 50%)";
  if (pct < 70) return "hsl(32, 95%, 55%)";
  return "hsl(80, 80%, 45%)";
}

function BatteryIcon({ pct, color }: { pct: number; color: string }) {
  const cls = "h-6 w-6";
  if (pct < 30) return <BatteryLow className={cls} style={{ color }} />;
  if (pct < 70) return <BatteryMedium className={cls} style={{ color }} />;
  return <BatteryFull className={cls} style={{ color }} />;
}

export default function CarWidget({ charger, fuel, battery, loading }: CarWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const isCharging = charger.status === "charging";
  const chargerColor = getStatusColor(charger.status);
  const km = fuel.rangeKm ?? 0;
  const fuelColor = getFuelColor(km);
  const pct = battery.percent ?? 0;
  const batteryColor = getBatteryColor(pct);

  return (
    <div className="widget-card h-full flex items-center justify-around gap-2 px-4">
      {/* Charger */}
      <div className="flex flex-col items-center gap-1">
        {isCharging ? (
          <PlugZap className="h-6 w-6 animate-pulse" style={{ color: chargerColor }} />
        ) : (
          <Plug className="h-6 w-6" style={{ color: chargerColor }} />
        )}
        <span className="text-xs font-medium text-foreground text-center leading-tight">
          {getStatusLabel(charger.status)}
        </span>
      </div>

      {/* Fuel */}
      {fuel.entityId && (
        <div className="flex flex-col items-center gap-1">
          <Fuel className="h-6 w-6" style={{ color: fuelColor }} />
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold font-mono" style={{ color: fuelColor }}>
              {km}
            </span>
            <span className="text-[10px] text-muted-foreground">km</span>
          </div>
        </div>
      )}

      {/* Battery */}
      {battery.entityId && (
        <div className="flex flex-col items-center gap-1">
          <BatteryIcon pct={pct} color={batteryColor} />
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold font-mono" style={{ color: batteryColor }}>
              {pct}
            </span>
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
        </div>
      )}
    </div>
  );
}
