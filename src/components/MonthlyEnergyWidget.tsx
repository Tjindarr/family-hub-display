import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export interface MonthlyEnergyData {
  monthlyCost: number | null;
  monthlyKwh: number | null;
  costHistory: { time: string; cost: number; kwh: number }[];
}

interface MonthlyEnergyWidgetProps {
  data: MonthlyEnergyData;
  loading: boolean;
}

function getCostColor(cost: number): string {
  if (cost < 700) return "hsl(120, 50%, 50%)";
  if (cost < 1500) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

export default function MonthlyEnergyWidget({ data, loading }: MonthlyEnergyWidgetProps) {
  if (loading) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  const cost = data.monthlyCost ?? 0;
  const kwh = data.monthlyKwh ?? 0;

  return (
    <div className="widget-card h-full">
      <div className="mb-3 flex items-baseline gap-4">
        <div>
          <span className="text-2xl font-bold font-mono" style={{ color: getCostColor(cost) }}>
            {Math.round(cost)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">kr</span>
        </div>
        <div>
          <span className="text-lg font-bold font-mono" style={{ color: "hsl(130, 50%, 45%)" }}>
            {Math.round(kwh)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">kWh</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">Månad</span>
      </div>

      {data.costHistory.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data.costHistory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <YAxis
              yAxisId="cost"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <YAxis
              yAxisId="kwh"
              orientation="right"
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
            <Bar yAxisId="kwh" dataKey="kwh" fill="hsl(130, 50%, 40%)" opacity={0.6} name="kWh" />
            <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="hsl(210, 100%, 50%)" strokeWidth={2} dot={false} name="Kr" />
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
