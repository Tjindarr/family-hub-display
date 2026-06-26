import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";
import type { PowerFlowConfig } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

function toIconName(name?: string): string {
  if (!name) return "mdi:flash";
  if (name.includes(":")) return name;
  return `mdi:${name}`;
}

export interface PowerFlowDeviceLive {
  entityId: string;
  current: number; // W
  history: { time: number; value: number }[];
  energyToday?: number; // kWh
}
export interface PowerFlowLiveData {
  devices: PowerFlowDeviceLive[];
  total: number;
  totalHistory: { time: number; value: number }[];
}

interface Props {
  config: PowerFlowConfig;
  data?: PowerFlowLiveData;
  loading?: boolean;
  fontSizes?: ResolvedFontSizes;
}

function formatPower(w: number, displayUnit: "W" | "kW"): { value: string; unit: string } {
  if (!isFinite(w)) return { value: "—", unit: displayUnit };
  if (displayUnit === "kW" || (displayUnit === "W" && Math.abs(w) >= 1000)) {
    return { value: (w / 1000).toFixed(w >= 10000 ? 1 : 2), unit: "kW" };
  }
  return { value: w.toFixed(w < 10 ? 1 : 0), unit: "W" };
}

function Sparkline({ history, color, height = 24 }: { history: { time: number; value: number }[]; color: string; height?: number }) {
  if (!history || history.length < 2) return <div style={{ height }} />;
  const gradId = `pfGrad_${color.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.floor(Math.random() * 100000)}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 1, right: 0, left: 0, bottom: 1 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.7} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, "dataMax + 1"]} hide />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PowerFlowWidget({ config, data, loading, fontSizes }: Props) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
  const unit = config.unit || "W";
  const topN = Math.max(0, config.topHighlightCount ?? 3);

  const sorted = useMemo(() => {
    const arr = (data?.devices || []).map((d) => {
      const cfg = config.devices.find((c) => c.entityId === d.entityId);
      return {
        ...d,
        label: cfg?.label || d.entityId,
        icon: cfg?.icon,
        color: cfg?.color || "hsl(45, 90%, 55%)",
      };
    });
    arr.sort((a, b) => (b.current || 0) - (a.current || 0));
    return arr;
  }, [data, config.devices]);

  const max = sorted.length ? Math.max(...sorted.map((d) => d.current || 0), 1) : 1;
  const total = data?.total ?? sorted.reduce((s, d) => s + (d.current || 0), 0);
  const totalFmt = formatPower(total, unit);

  if (loading && !data) {
    return <div className="widget-card h-full animate-pulse" />;
  }

  return (
    <div className="widget-card h-full p-2 flex flex-col min-h-0">
      {/* Header — total + sparkline */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <Icon icon="mdi:flash" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span
          className="font-medium uppercase tracking-wider text-muted-foreground"
          style={{ fontSize: fs.label }}
        >
          {config.label || "Power Flow"}
        </span>
        {config.showTotal !== false && (
          <div className="ml-auto flex items-baseline gap-0.5">
            <span className="font-mono font-semibold" style={{ fontSize: fs.value, color: "hsl(45, 90%, 55%)" }}>
              {totalFmt.value}
            </span>
            <span className="text-muted-foreground" style={{ fontSize: fs.label }}>{totalFmt.unit}</span>
          </div>
        )}
      </div>
      {config.showTotal !== false && data?.totalHistory && data.totalHistory.length > 1 && (
        <div className="px-1 mb-1">
          <Sparkline history={data.totalHistory} color="hsl(45, 90%, 55%)" height={20} />
        </div>
      )}

      {/* Device list */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground" style={{ fontSize: fs.body }}>
          No power devices configured
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
          {sorted.map((d, i) => {
            const isTop = i < topN && d.current > 0;
            const v = formatPower(d.current || 0, unit);
            const pct = Math.max(2, Math.round(((d.current || 0) / max) * 100));
            return (
              <div
                key={d.entityId}
                className={`relative flex items-center gap-2 px-2 py-1 rounded-md border overflow-hidden ${
                  isTop ? "border-primary/40 bg-primary/5" : "border-border/30 bg-muted/30"
                }`}
              >
                {/* bar background */}
                <div
                  className="absolute inset-y-0 left-0 pointer-events-none"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${d.color}33, ${d.color}11)`,
                  }}
                />
                <Icon
                  icon={toIconName(d.icon)}
                  className="shrink-0 relative z-10"
                  style={{ width: 16, height: 16, color: d.color }}
                />
                <span
                  className="flex-1 truncate relative z-10"
                  style={{ fontSize: fs.body, color: isTop ? "hsl(var(--foreground))" : "hsl(var(--foreground) / 0.85)" }}
                >
                  {d.label}
                  {isTop && (
                    <span
                      className="ml-1 text-[9px] uppercase tracking-wider text-primary/80"
                    >
                      top
                    </span>
                  )}
                </span>
                <div className="w-12 shrink-0 relative z-10 hidden sm:block">
                  <Sparkline history={d.history} color={d.color} height={18} />
                </div>
                <div className="flex items-baseline gap-0.5 relative z-10 shrink-0 font-mono">
                  <span style={{ fontSize: fs.body, color: d.color }}>{v.value}</span>
                  <span className="text-muted-foreground" style={{ fontSize: fs.label }}>{v.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
