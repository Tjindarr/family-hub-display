import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Zap } from "lucide-react";

export interface PowerUsageData {
  currentWatt: number | null;
  maxWatt: number | null;
  powerHistory: { time: string; watt: number }[];
}

interface PowerUsageWidgetProps {
  data: PowerUsageData;
  loading: boolean;
}

function getPowerColor(watt: number): string {
  if (watt < 700) return "hsl(120, 50%, 50%)";
  if (watt < 1500) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

export default function PowerUsageWidget({ data, loading }: PowerUsageWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const current = data.currentWatt ?? 0;
  const max = data.maxWatt ?? 0;

  return (
    <div className="widget-card h-full">
      <div className="mb-3 flex items-baseline gap-4">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4" style={{ color: getPowerColor(current) }} />
          <span className="text-2xl font-bold font-mono" style={{ color: getPowerColor(current) }}>
            {Math.round(current)}
          </span>
          <span className="text-xs text-muted-foreground">W</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Max </span>
          <span className="text-lg font-bold font-mono text-foreground">
            {Math.round(max)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">W</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">Power</span>
      </div>

      {data.powerHistory.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data.powerHistory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 13%)",
                border: "1px solid hsl(220, 14%, 20%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 92%)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="watt" fill="hsl(210, 100%, 50%)" opacity={0.5} name="Watt" />
            <Line type="monotone" dataKey="watt" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={false} name="W" />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
          No history data available
        </div>
      )}
    </div>
  );
}
