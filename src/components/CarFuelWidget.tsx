import { Fuel } from "lucide-react";

export interface CarFuelData {
  rangeKm: number | null;
  entityId: string;
}

interface CarFuelWidgetProps {
  data: CarFuelData;
  loading: boolean;
}

function getFuelColor(km: number): string {
  if (km < 100) return "hsl(0, 72%, 50%)";
  if (km < 280) return "hsl(32, 95%, 55%)";
  return "hsl(140, 50%, 45%)";
}

export default function CarFuelWidget({ data, loading }: CarFuelWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const km = data.rangeKm ?? 0;
  const color = getFuelColor(km);

  return (
    <div className="widget-card h-full flex flex-col items-center justify-center gap-2">
      <Fuel className="h-8 w-8" style={{ color }} />
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {km}
        </span>
        <span className="text-xs text-muted-foreground">km</span>
      </div>
    </div>
  );
}
