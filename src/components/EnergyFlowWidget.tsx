import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EnergyFlowConfig, HAState, DashboardConfig } from "@/lib/config";
import { isConfigured as checkConfigured } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import { resolveEntityValue } from "@/lib/entity-resolver";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface Props {
  config: EnergyFlowConfig;
  getState?: (entityId: string) => HAState | undefined;
  demoMode?: boolean;
  fontSizes?: ResolvedFontSizes;
  dashboardConfig?: DashboardConfig;
}

function num(getState: ((id: string) => HAState | undefined) | undefined, ref?: string): number | null {
  if (!ref || !getState) return null;
  const { value } = resolveEntityValue(ref, getState);
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return isFinite(n) ? n : null;
}

function formatPower(w: number): { value: string; unit: string } {
  if (!isFinite(w) || w === 0) return { value: "0", unit: "W" };
  const abs = Math.abs(w);
  if (abs >= 1000) return { value: (w / 1000).toFixed(abs >= 10000 ? 1 : 2), unit: "kW" };
  return { value: w.toFixed(abs < 10 ? 1 : 0), unit: "W" };
}

function formatEnergy(kwh: number | null): string {
  if (kwh === null || !isFinite(kwh)) return "—";
  if (Math.abs(kwh) >= 100) return `${kwh.toFixed(0)} kWh`;
  return `${kwh.toFixed(1)} kWh`;
}

interface FlowLink {
  from: "solar" | "grid" | "battery";
  to: "home" | "battery" | "grid" | "car";
  power: number;
  color: string;
}

// Demo data: includes a car that charges only when surplus solar is available
function demoValues(t: number) {
  const hourFrac = (t / 60000) % 1;
  const sunPhase = Math.sin(hourFrac * Math.PI);
  const solar = Math.max(0, sunPhase * 4500 + (Math.random() - 0.5) * 200);

  const home = 850 + Math.sin(t / 7000) * 120 + Math.random() * 60;

  // Car charges when solar is high (above 2.5kW)
  const carCharging = solar > 2500;
  const car = carCharging ? Math.min(3300, solar * 0.55) : 0;

  // Battery balances next
  let battery: number;
  let soc = 50 + Math.sin(t / 30000) * 30;
  soc = Math.max(5, Math.min(98, soc));
  const surplusAfterCar = solar - home - car;
  if (surplusAfterCar > 200) {
    battery = -(Math.min(2500, surplusAfterCar - 100)); // charging (neg)
  } else if (surplusAfterCar < -100) {
    battery = Math.min(1800, -surplusAfterCar - 50);    // discharging (pos)
  } else {
    battery = (Math.random() - 0.5) * 60;
  }

  const grid = home + car - solar + Math.max(0, -battery) - Math.max(0, battery);

  return {
    solar, home, car, carCharging, battery, soc, grid,
    solarToday: 12 + sunPhase * 16,
    homeToday: 18.4,
    carToday: 7.8,
    gridImportToday: 6.1,
    gridExportToday: 3.7,
  };
}

const DAY_BUCKETS = 96; // 15 min buckets

export default function EnergyFlowWidget({ config, getState, demoMode, fontSizes, dashboardConfig }: Props) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!demoMode) return;
    const id = window.setInterval(() => setTick(Date.now()), 1500);
    return () => window.clearInterval(id);
  }, [demoMode]);

  const colors = {
    solar: config.solarColor || "hsl(45, 95%, 55%)",
    battery: config.batteryColor || "hsl(140, 70%, 50%)",
    grid: config.gridColor || "hsl(210, 80%, 60%)",
    home: config.homeColor || "hsl(280, 60%, 65%)",
    car: config.carColor || "hsl(190, 80%, 55%)",
  };

  const live = useMemo(() => {
    if (demoMode) {
      const d = demoValues(tick);
      return {
        solar: d.solar,
        battery: d.battery,
        batteryCharging: d.battery < 0,
        batteryDischarging: d.battery > 0,
        batteryAbs: Math.abs(d.battery),
        soc: d.soc,
        grid: d.grid,
        gridImporting: d.grid > 0,
        gridExporting: d.grid < 0,
        gridAbs: Math.abs(d.grid),
        home: d.home,
        car: d.car,
        carCharging: d.carCharging,
        solarToday: d.solarToday,
        homeToday: d.homeToday,
        carToday: d.carToday,
        gridImportToday: d.gridImportToday,
        gridExportToday: d.gridExportToday,
      };
    }

    const solar = Math.max(0, num(getState, config.solarPowerEntity) ?? 0);
    const batteryRaw = num(getState, config.batteryPowerEntity) ?? 0;
    const gridRaw = num(getState, config.gridPowerEntity) ?? 0;
    const soc = num(getState, config.batterySocEntity);

    const batteryDischarging = config.batteryPowerSign === "charge_positive" ? batteryRaw < 0 : batteryRaw > 0;
    const batteryCharging = config.batteryPowerSign === "charge_positive" ? batteryRaw > 0 : batteryRaw < 0;

    const gridImporting = config.gridPowerSign === "export_positive" ? gridRaw < 0 : gridRaw > 0;
    const gridExporting = config.gridPowerSign === "export_positive" ? gridRaw > 0 : gridRaw < 0;

    const batteryAbs = Math.abs(batteryRaw);
    const gridAbs = Math.abs(gridRaw);

    const car = Math.max(0, num(getState, config.carPowerEntity) ?? 0);
    let carCharging = car > 20;
    if (config.carChargingStateEntity && getState) {
      const s = getState(config.carChargingStateEntity);
      if (s) {
        const v = String(s.state).toLowerCase();
        carCharging = ["on", "charging", "true", "active"].includes(v) || car > 20;
      }
    }

    let home = num(getState, config.homePowerEntity);
    if (home === null) {
      const fromGrid = gridImporting ? gridAbs : 0;
      const fromBat = batteryDischarging ? batteryAbs : 0;
      const toGrid = gridExporting ? gridAbs : 0;
      const toBat = batteryCharging ? batteryAbs : 0;
      // Subtract car load so "home" reflects rest-of-house only
      home = Math.max(0, solar + fromGrid + fromBat - toGrid - toBat - car);
    }

    return {
      solar, battery: batteryRaw, batteryCharging, batteryDischarging, batteryAbs, soc,
      grid: gridRaw, gridImporting, gridExporting, gridAbs, home,
      car, carCharging,
      solarToday: num(getState, config.solarEnergyTodayEntity),
      homeToday: num(getState, config.homeEnergyTodayEntity),
      carToday: num(getState, config.carEnergyTodayEntity),
      gridImportToday: num(getState, config.gridImportTodayEntity),
      gridExportToday: num(getState, config.gridExportTodayEntity),
    };
  }, [demoMode, tick, getState, config]);

  const showSolar = demoMode || !!config.solarPowerEntity;
  const showBattery = demoMode || !!config.batteryPowerEntity || !!config.batterySocEntity;
  const showGrid = demoMode || !!config.gridPowerEntity;
  const showCar = demoMode || !!config.carPowerEntity;

  const flows = useMemo<FlowLink[]>(() => {
    const out: FlowLink[] = [];
    let pvBudget = live.solar;
    // PV -> car (charging takes priority when surplus solar)
    if (showSolar && showCar && live.carCharging && live.car > 5) {
      const p = Math.min(pvBudget, live.car);
      if (p > 5) {
        out.push({ from: "solar", to: "car", power: p, color: colors.solar });
        pvBudget -= p;
      }
    }
    if (showSolar && showBattery && live.batteryCharging && live.batteryAbs > 5) {
      const p = Math.min(pvBudget, live.batteryAbs);
      if (p > 5) {
        out.push({ from: "solar", to: "battery", power: p, color: colors.solar });
        pvBudget -= p;
      }
    }
    if (showSolar && showGrid && live.gridExporting && live.gridAbs > 5) {
      const p = Math.min(pvBudget, live.gridAbs);
      if (p > 5) {
        out.push({ from: "solar", to: "grid", power: p, color: colors.solar });
        pvBudget -= p;
      }
    }
    if (showSolar && pvBudget > 5) {
      out.push({ from: "solar", to: "home", power: pvBudget, color: colors.solar });
    }
    if (showBattery && live.batteryDischarging && live.batteryAbs > 5) {
      out.push({ from: "battery", to: "home", power: live.batteryAbs, color: colors.battery });
    }
    if (showGrid && live.gridImporting && live.gridAbs > 5) {
      // Grid -> car when car charging exceeds available solar
      const solarToCar = out.find((f) => f.from === "solar" && f.to === "car")?.power || 0;
      const carDeficit = Math.max(0, (live.car || 0) - solarToCar);
      if (showCar && carDeficit > 5) {
        const p = Math.min(live.gridAbs, carDeficit);
        out.push({ from: "grid", to: "car", power: p, color: colors.grid });
      }
      const rest = Math.max(0, live.gridAbs - (showCar ? carDeficit : 0));
      if (rest > 5) {
        out.push({ from: "grid", to: "home", power: rest, color: colors.grid });
      }
    }
    return out;
  }, [live, showSolar, showBattery, showGrid, showCar, colors]);

  const showAnimations = config.showAnimations !== false;
  const showSocBar = config.showSocBar !== false;
  const show24hChart = !!config.show24hChart;

  // ── Layout (SVG) — 5 nodes ──
  // viewBox 300x230. Solar top, Grid left, Home center, Battery right, Car bottom-center
  const NODE = {
    solar:   { x: 150, y: 30,  icon: "mdi:white-balance-sunny", label: "Solar",   color: colors.solar },
    grid:    { x: 45,  y: 115, icon: "mdi:transmission-tower",  label: "Grid",    color: colors.grid },
    battery: { x: 255, y: 115, icon: "mdi:battery",             label: "Battery", color: colors.battery },
    home:    { x: 150, y: 115, icon: "mdi:home",                label: "Home",    color: colors.home },
    car:     { x: 150, y: 200, icon: "mdi:car-electric",        label: config.carLabel || "Car", color: colors.car },
  } as const;

  const linkPath = (from: keyof typeof NODE, to: keyof typeof NODE) => {
    const a = NODE[from]; const b = NODE[to];
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  };

  const valFont = fontSizes?.value ?? 16;
  const labelFont = fontSizes?.label ?? 10;

  const animDur = (w: number) => {
    const clamped = Math.max(50, Math.min(5000, w));
    return `${(3.5 - (clamped / 5000) * 2.8).toFixed(2)}s`;
  };

  // ─── 24h history fetch ───
  const [historyData, setHistoryData] = useState<Array<Record<string, number>>>([]);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!show24hChart) return;
    if (demoMode) {
      // Synthesize 24h of demo history
      const pts: Array<Record<string, number>> = [];
      const now = Date.now();
      for (let i = DAY_BUCKETS; i >= 0; i--) {
        const t = now - i * 15 * 60_000;
        const hourFrac = ((t / (24 * 3600_000)) % 1);
        const sunPhase = Math.max(0, Math.sin((hourFrac - 0.25) * 2 * Math.PI));
        const solar = sunPhase * 4500 * (0.85 + 0.3 * Math.random());
        const home = 700 + 250 * Math.sin(t / 3600_000) + Math.random() * 100;
        const car = sunPhase > 0.5 ? 3000 * (0.8 + 0.2 * Math.random()) : 0;
        const battery = Math.max(0, solar - home - car) > 200 ? -Math.min(2500, solar - home - car - 100) : 0;
        const grid = home + car - solar + Math.max(0, -battery);
        pts.push({
          time: t,
          solar,
          home,
          car,
          battery: Math.abs(battery),
          grid: Math.max(0, grid),
          gridExport: Math.max(0, -grid),
        });
      }
      setHistoryData(pts);
      return;
    }
    if (!dashboardConfig || !checkConfigured(dashboardConfig)) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const entities: Record<string, string | undefined> = {
      solar: config.solarPowerEntity,
      home: config.homePowerEntity,
      battery: config.batteryPowerEntity,
      grid: config.gridPowerEntity,
      car: config.carPowerEntity,
    };

    const load = async () => {
      const client = createHAClient(dashboardConfig);
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 3600_000);
      const series: Record<string, { time: number; value: number }[]> = {};
      await Promise.all(
        Object.entries(entities).map(async ([key, eid]) => {
          if (!eid) return;
          try {
            const raw = await client.getHistory(eid, start.toISOString(), now.toISOString());
            if (raw?.[0]) {
              series[key] = raw[0]
                .map((s: any) => ({ time: Date.parse(s.last_changed), value: parseFloat(s.state) }))
                .filter((p: any) => !isNaN(p.time) && !isNaN(p.value));
            }
          } catch { /* ignore */ }
        }),
      );
      // Bucket to 15-min
      const bucketMs = 15 * 60_000;
      const bucketMap: Record<number, Record<string, number>> = {};
      const startBk = Math.floor(start.getTime() / bucketMs) * bucketMs;
      const endBk = Math.floor(now.getTime() / bucketMs) * bucketMs;
      for (let bk = startBk; bk <= endBk; bk += bucketMs) bucketMap[bk] = { time: bk };
      for (const [key, pts] of Object.entries(series)) {
        let lastVal = 0;
        for (const p of pts) {
          const bk = Math.floor(p.time / bucketMs) * bucketMs;
          if (bucketMap[bk]) bucketMap[bk][key] = Math.abs(p.value);
        }
        // Forward-fill
        for (let bk = startBk; bk <= endBk; bk += bucketMs) {
          if (bucketMap[bk][key] !== undefined) lastVal = bucketMap[bk][key];
          else bucketMap[bk][key] = lastVal;
        }
      }
      setHistoryData(Object.values(bucketMap).sort((a, b) => a.time - b.time));
    };
    load();
    const t = window.setInterval(() => { fetchedRef.current = false; load(); }, 15 * 60_000);
    return () => window.clearInterval(t);
  }, [show24hChart, demoMode, dashboardConfig, config.solarPowerEntity, config.homePowerEntity, config.batteryPowerEntity, config.gridPowerEntity, config.carPowerEntity]);

  const chartHeight = config.chart24hHeight ?? 90;
  const chartStacked = config.chart24hStacked !== false;

  const formatHour = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:00`;
  };

  return (
    <div className="widget-card h-full flex flex-col">
      {config.label && (
        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
          {config.label}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        <svg viewBox="0 0 300 230" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <g>
            {flows.map((f, i) => (
              <g key={i}>
                <path d={linkPath(f.from, f.to)} stroke={f.color} strokeOpacity={0.25} strokeWidth={2} fill="none" />
                {showAnimations && (
                  <circle r={3} fill={f.color}>
                    <animateMotion dur={animDur(f.power)} repeatCount="indefinite" path={linkPath(f.from, f.to)} />
                  </circle>
                )}
              </g>
            ))}
            {/* Idle topology hints */}
            {showSolar && !flows.some((f) => f.from === "solar") && (
              <path d={linkPath("solar", "home")} stroke="hsl(var(--border))" strokeOpacity={0.2} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
            {showBattery && !flows.some((f) => f.from === "battery" || f.to === "battery") && (
              <path d={linkPath("battery", "home")} stroke="hsl(var(--border))" strokeOpacity={0.2} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
            {showGrid && !flows.some((f) => f.from === "grid" || f.to === "grid") && (
              <path d={linkPath("grid", "home")} stroke="hsl(var(--border))" strokeOpacity={0.2} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
            {showCar && !flows.some((f) => f.to === "car") && (
              <path d={linkPath("home", "car")} stroke="hsl(var(--border))" strokeOpacity={0.2} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
          </g>

          {(["solar", "grid", "battery", "home", "car"] as const).map((k) => {
            const show = k === "home" ? true : k === "solar" ? showSolar : k === "grid" ? showGrid : k === "battery" ? showBattery : showCar;
            if (!show) return null;
            const n = NODE[k];
            return <circle key={k} cx={n.x} cy={n.y} r={22} fill="hsl(var(--card))" stroke={n.color} strokeWidth={1.5} />;
          })}
        </svg>

        {/* HTML overlay for icons/values */}
        <div className="absolute inset-0 pointer-events-none">
          {(["solar", "grid", "battery", "home", "car"] as const).map((k) => {
            const show = k === "home" ? true : k === "solar" ? showSolar : k === "grid" ? showGrid : k === "battery" ? showBattery : showCar;
            if (!show) return null;
            const n = NODE[k];
            let power = 0;
            let sublabel = "";
            if (k === "solar") { power = live.solar; sublabel = formatEnergy(live.solarToday); }
            else if (k === "grid") { power = live.gridAbs; sublabel = live.gridImporting ? "Import" : live.gridExporting ? "Export" : "Idle"; }
            else if (k === "battery") {
              power = live.batteryAbs;
              const socStr = live.soc !== null && live.soc !== undefined ? `${Math.round(live.soc)}%` : "";
              const dir = live.batteryCharging ? "Charging" : live.batteryDischarging ? "Discharging" : "Idle";
              sublabel = socStr ? `${socStr} · ${dir}` : dir;
            } else if (k === "car") {
              power = live.car;
              sublabel = live.carCharging ? (live.carToday !== null ? `Charging · ${formatEnergy(live.carToday)}` : "Charging") : "Idle";
            } else { power = live.home; sublabel = formatEnergy(live.homeToday); }
            const p = formatPower(power);
            const leftPct = (n.x / 300) * 100;
            const topPct = (n.y / 230) * 100;
            return (
              <div key={k} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
                   style={{ left: `${leftPct}%`, top: `${topPct}%`, width: 92 }}>
                <Icon icon={n.icon} style={{ color: n.color, width: 20, height: 20 }} />
                <div style={{ color: n.color, fontSize: Math.max(11, valFont - 2), fontWeight: 600, lineHeight: 1.05 }}>
                  {p.value}<span style={{ fontSize: labelFont, marginLeft: 2, opacity: 0.85 }}>{p.unit}</span>
                </div>
                <div className="text-muted-foreground" style={{ fontSize: labelFont, lineHeight: 1.1 }}>{sublabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Large SoC bar */}
      {showSocBar && showBattery && live.soc !== null && live.soc !== undefined && (
        <div className="mt-1 px-1">
          <div className="flex items-center justify-between" style={{ fontSize: labelFont }}>
            <span className="text-muted-foreground flex items-center gap-1">
              <Icon icon="mdi:battery-charging" style={{ color: colors.battery, width: 12, height: 12 }} />
              Battery SoC
            </span>
            <span style={{ color: colors.battery, fontWeight: 600 }}>{Math.round(live.soc)}%</span>
          </div>
          <div className="mt-0.5 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
            <div className="h-full transition-all duration-700"
                 style={{ width: `${Math.max(0, Math.min(100, live.soc))}%`, background: `linear-gradient(90deg, ${colors.battery}aa, ${colors.battery})` }} />
          </div>
        </div>
      )}

      {/* 24h history chart */}
      {show24hChart && historyData.length > 0 && (
        <div className="mt-1 pt-1 border-t border-border/30">
          <div className="text-muted-foreground mb-0.5" style={{ fontSize: labelFont }}>Last 24h</div>
          <div style={{ height: chartHeight, minHeight: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                <defs>
                  {(["solar", "home", "battery", "grid", "car"] as const).map((k) => (
                    <linearGradient key={k} id={`eg-${config.id}-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors[k]} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={colors[k]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="time" tickFormatter={formatHour} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                       interval="preserveStartEnd" minTickGap={40} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(t) => new Date(t as number).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  formatter={(v: any, name: string) => [`${formatPower(Number(v)).value} ${formatPower(Number(v)).unit}`, name]}
                />
                {showSolar && <Area type="monotone" dataKey="solar" name="Solar" stroke={colors.solar} fill={`url(#eg-${config.id}-solar)`} stackId={chartStacked ? "s" : undefined} />}
                {showCar && <Area type="monotone" dataKey="car" name="Car" stroke={colors.car} fill={`url(#eg-${config.id}-car)`} stackId={chartStacked ? "s" : undefined} />}
                <Area type="monotone" dataKey="home" name="Home" stroke={colors.home} fill={`url(#eg-${config.id}-home)`} stackId={chartStacked ? "s" : undefined} />
                {showBattery && <Area type="monotone" dataKey="battery" name="Battery" stroke={colors.battery} fill={`url(#eg-${config.id}-battery)`} stackId={chartStacked ? "s" : undefined} />}
                {showGrid && <Area type="monotone" dataKey="grid" name="Grid" stroke={colors.grid} fill={`url(#eg-${config.id}-grid)`} stackId={chartStacked ? "s" : undefined} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(config.showDayTotals !== false) && (
        <div className="mt-1 pt-1 border-t border-border/30 grid grid-cols-4 gap-1 text-center" style={{ fontSize: labelFont }}>
          <div>
            <div className="text-muted-foreground">Solar</div>
            <div style={{ color: colors.solar, fontWeight: 600 }}>{formatEnergy(live.solarToday)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Home</div>
            <div style={{ color: colors.home, fontWeight: 600 }}>{formatEnergy(live.homeToday)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Car</div>
            <div style={{ color: colors.car, fontWeight: 600 }}>{formatEnergy(live.carToday)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Grid ±</div>
            <div style={{ color: colors.grid, fontWeight: 600 }}>
              {formatEnergy(live.gridImportToday)}
              {live.gridExportToday !== null && live.gridExportToday > 0 && (
                <span style={{ opacity: 0.7, marginLeft: 3 }}>/ −{formatEnergy(live.gridExportToday).replace(" kWh", "")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
