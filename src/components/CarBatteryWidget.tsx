import { Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";

export interface CarBatteryData {
  percent: number | null;
  entityId: string;
}

interface CarBatteryWidgetProps {
  data: CarBatteryData;
  loading: boolean;
}

function getBatteryColor(pct: number): string {
  if (pct < 30) return "hsl(0, 72%, 50%)";
  if (pct < 70) return "hsl(32, 95%, 55%)";
  return "hsl(80, 80%, 45%)";
}

function BatteryIcon({ pct, color }: { pct: number; color: string }) {
  const cls = "h-8 w-8";
  if (pct < 30) return <BatteryLow className={cls} style={{ color }} />;
  if (pct < 70) return <BatteryMedium className={cls} style={{ color }} />;
  return <BatteryFull className={cls} style={{ color }} />;
}

export default function CarBatteryWidget({ data, loading }: CarBatteryWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  if (!data.entityId) {
    return (
      <div className="widget-card h-full flex flex-col items-center justify-center gap-2">
        <Battery className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No battery entity configured</span>
      </div>
    );
  }

  const pct = data.percent ?? 0;
  const color = getBatteryColor(pct);

  return (
    <div className="widget-card h-full flex flex-col items-center justify-center gap-2">
      <BatteryIcon pct={pct} color={color} />
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {pct}
        </span>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
