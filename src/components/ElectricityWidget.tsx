import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { NordpoolData } from "@/hooks/useDashboardData";

interface ElectricityWidgetProps {
  nordpool: NordpoolData;
  loading: boolean;
}

function getPriceColor(price: number): string {
  if (price < 0.50) return "hsl(120, 50%, 50%)";
  if (price < 1.00) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

function getPriceBadgeClass(price: number): string {
  if (price < 0.50) return "price-badge-low";
  if (price < 1.00) return "price-badge-mid";
  return "price-badge-high";
}

function formatHour(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ElectricityWidget({ nordpool, loading }: ElectricityWidgetProps) {
  const { today, tomorrow, currentPrice } = nordpool;

  // Merge into chart data
  const chartData = [
    ...today.map((p) => ({
      time: p.time.getTime(),
      timeLabel: formatHour(p.time),
      today: p.price,
      tomorrow: null as number | null,
      isToday: true,
    })),
    ...tomorrow.map((p) => ({
      time: p.time.getTime(),
      timeLabel: formatHour(p.time),
      today: null as number | null,
      tomorrow: p.price,
      isToday: false,
    })),
  ].sort((a, b) => a.time - b.time);

  const allPrices = [...today.map((p) => p.price), ...tomorrow.map((p) => p.price)];
  const avgPrice = allPrices.length > 0 ? allPrices.reduce((s, p) => s + p, 0) / allPrices.length : 0;
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

  // Find the time of the lowest price
  const allPoints = [...today, ...tomorrow];
  const minPoint = allPoints.length > 0 ? allPoints.reduce((min, p) => p.price < min.price ? p : min, allPoints[0]) : null;
  const minTimeStr = minPoint ? formatHour(minPoint.time) : "";

  // Find current time position
  const nowMs = Date.now();

  // Custom tick: show every 3rd hour
  const ticks = chartData
    .filter((_, i) => i % 3 === 0)
    .map((d) => d.time);

  return (
    <div className="widget-card h-full">
      {/* Current price with badge */}
      <div className="mb-4 flex items-baseline gap-3">
        <span className="stat-value" style={{ color: getPriceColor(currentPrice) }}>
          {currentPrice.toFixed(2)}
        </span>
        <span className="stat-label">kr/kWh</span>
        <span className={getPriceBadgeClass(currentPrice)}>
          {currentPrice < 0.50 ? "Low" : currentPrice < 1.00 ? "Medium" : "High"}
        </span>
      </div>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="tomorrowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(130, 50%, 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(130, 50%, 40%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(val) => formatHour(new Date(val))}
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(220, 14%, 20%)" }}
              domain={[0, "auto"]}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              labelFormatter={(val) => {
                const d = new Date(val);
                return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) +
                  " " + formatHour(d);
              }}
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 13%)",
                border: "1px solid hsl(220, 14%, 20%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 92%)",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(3)} kr/kWh`,
                name === "today" ? "Idag" : "Imorgon",
              ]}
            />
            {/* Now marker */}
            <ReferenceLine x={nowMs} stroke="hsl(174, 72%, 50%)" strokeWidth={2} strokeDasharray="4 2" label="" />
            {/* Average line */}
            <ReferenceLine y={avgPrice} stroke="hsl(215, 12%, 40%)" strokeDasharray="4 4" />

            <Area
              type="stepAfter"
              dataKey="today"
              stroke="hsl(210, 100%, 50%)"
              strokeWidth={2}
              fill="url(#todayGrad)"
              dot={false}
              connectNulls={false}
              name="today"
            />
            <Area
              type="stepAfter"
              dataKey="tomorrow"
              stroke="hsl(130, 50%, 40%)"
              strokeWidth={2}
              fill="url(#tomorrowGrad)"
              dot={false}
              connectNulls={false}
              name="tomorrow"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Stats row */}
      <div className="mt-3 flex gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "hsl(210, 100%, 50%)" }} />
          <span className="text-muted-foreground">Idag</span>
        </div>
        {tomorrow.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: "hsl(130, 50%, 40%)" }} />
            <span className="text-muted-foreground">Imorgon</span>
          </div>
        )}
        <div className="ml-auto flex gap-4">
          <div>
            <span className="text-muted-foreground">Avg </span>
            <span className="font-mono font-medium text-foreground">{avgPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Min </span>
            <span className="font-mono font-medium" style={{ color: "hsl(120, 50%, 50%)" }}>
              {minPrice.toFixed(2)}
            </span>
            {minTimeStr && (
              <span className="text-muted-foreground ml-1">@ {minTimeStr}</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Max </span>
            <span className="font-mono font-medium" style={{ color: "hsl(0, 72%, 55%)" }}>
              {maxPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
