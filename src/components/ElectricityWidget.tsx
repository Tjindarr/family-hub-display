import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { Zap } from "lucide-react";
import type { ElectricityPrice } from "@/lib/config";

interface ElectricityWidgetProps {
  prices: ElectricityPrice[];
  loading: boolean;
}

function getPriceColor(price: number): string {
  if (price < 0.15) return "hsl(120, 50%, 50%)";
  if (price < 0.30) return "hsl(32, 95%, 55%)";
  return "hsl(0, 72%, 55%)";
}

function getPriceBadgeClass(price: number): string {
  if (price < 0.15) return "price-badge-low";
  if (price < 0.30) return "price-badge-mid";
  return "price-badge-high";
}

export default function ElectricityWidget({ prices, loading }: ElectricityWidgetProps) {
  const currentPrice = prices.length > 0 ? prices[0].price : 0;
  const avgPrice = prices.length > 0
    ? prices.reduce((sum, p) => sum + p.price, 0) / prices.length
    : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices.map((p) => p.price)) : 0;

  return (
    <div className="widget-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-chart-2" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Electricity Price
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={getPriceBadgeClass(currentPrice)}>
            {currentPrice < 0.15 ? "Low" : currentPrice < 0.30 ? "Medium" : "High"}
          </span>
        </div>
      </div>

      {/* Current price */}
      <div className="mb-4 flex items-baseline gap-3">
        <span className="stat-value" style={{ color: getPriceColor(currentPrice) }}>
          {currentPrice.toFixed(2)}
        </span>
        <span className="stat-label">kr/kWh now</span>
      </div>

      {loading ? (
        <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={prices} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 10 }}
              interval={2}
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
              formatter={(value: number) => [`${value.toFixed(3)} kr/kWh`, "Price"]}
            />
            <ReferenceLine y={avgPrice} stroke="hsl(215, 12%, 40%)" strokeDasharray="4 4" />
            <Bar dataKey="price" radius={[3, 3, 0, 0]}>
              {prices.map((entry, index) => (
                <Cell key={index} fill={getPriceColor(entry.price)} fillOpacity={index === 0 ? 1 : 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Stats row */}
      <div className="mt-3 flex gap-6 text-xs">
        <div>
          <span className="text-muted-foreground">Avg </span>
          <span className="font-mono font-medium text-foreground">{avgPrice.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Min </span>
          <span className="font-mono font-medium" style={{ color: "hsl(120, 50%, 50%)" }}>
            {minPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Max </span>
          <span className="font-mono font-medium" style={{ color: "hsl(0, 72%, 55%)" }}>
            {maxPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
