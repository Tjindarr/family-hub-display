import { Plug, PlugZap } from "lucide-react";

export interface CarChargerData {
  status: string;
  entityId: string;
}

interface CarChargerWidgetProps {
  data: CarChargerData;
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

export default function CarChargerWidget({ data, loading }: CarChargerWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const isConnected = data.status !== "disconnected";
  const isCharging = data.status === "charging";
  const color = getStatusColor(data.status);

  return (
    <div className="widget-card h-full flex flex-col items-center justify-center gap-2">
      {isCharging ? (
        <PlugZap className="h-8 w-8 animate-pulse" style={{ color }} />
      ) : (
        <Plug className="h-8 w-8" style={{ color }} />
      )}
      <span className="text-sm font-medium text-foreground">
        {getStatusLabel(data.status)}
      </span>
    </div>
  );
}
