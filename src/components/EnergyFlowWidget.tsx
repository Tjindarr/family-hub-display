import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { EnergyFlowConfig, HAState } from "@/lib/config";
import { resolveEntityValue } from "@/lib/entity-resolver";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface Props {
  config: EnergyFlowConfig;
  getState?: (entityId: string) => HAState | undefined;
  demoMode?: boolean;
  fontSizes?: ResolvedFontSizes;
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

interface NodeStat {
  show: boolean;
  power: number;       // current W (always >= 0 for display)
  todayKwh: number | null;
  socPct?: number | null; // battery only
}

interface FlowLink {
  from: "solar" | "grid" | "battery";
  to: "home" | "battery" | "grid";
  power: number; // W
  color: string;
}

// Demo data generator — produces realistic solar/battery/grid waveform that varies smoothly over time
function demoValues(t: number) {
  // Solar follows a daily curve, but we accelerate to make it visible (period ~ 60s)
  const hourFrac = (t / 60000) % 1; // 0..1 over 60s
  const sunPhase = Math.sin(hourFrac * Math.PI); // 0..1..0
  const solar = Math.max(0, sunPhase * 4200 + (Math.random() - 0.5) * 200);

  // Home consumption: baseline + small wobble
  const home = 850 + Math.sin(t / 7000) * 120 + Math.random() * 60;

  // Battery: charges when solar > home, discharges otherwise
  let battery: number;
  let soc = 50 + Math.sin(t / 30000) * 30;
  soc = Math.max(5, Math.min(98, soc));
  if (solar > home + 200) {
    battery = -(Math.min(2500, solar - home - 100)); // charging (neg)
  } else if (solar < home - 100) {
    battery = Math.min(1800, home - solar - 50);     // discharging (pos)
  } else {
    battery = (Math.random() - 0.5) * 60;
  }

  // Grid balances the rest: home - solar + batteryCharging
  const net = home - solar + Math.max(0, -battery) - Math.max(0, battery);
  const grid = net; // positive = importing

  return {
    solar,
    home,
    battery, // sign: charge<0, discharge>0
    soc,
    grid,    // sign: import>0, export<0
    solarToday: 12 + sunPhase * 16,
    homeToday: 18.4,
    batteryToday: 4.2,
    gridImportToday: 6.1,
    gridExportToday: 3.7,
  };
}

export default function EnergyFlowWidget({ config, getState, demoMode, fontSizes }: Props) {
  // Tick for demo animation
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
  };

  // Resolve live values
  const live = useMemo(() => {
    if (demoMode) {
      const d = demoValues(tick);
      return {
        solar: d.solar,
        battery: d.battery,
        batteryCharging: config.batteryPowerSign === "charge_positive" ? d.battery > 0 : d.battery < 0,
        batteryDischarging: config.batteryPowerSign === "charge_positive" ? d.battery < 0 : d.battery > 0,
        batteryAbs: Math.abs(d.battery),
        soc: d.soc,
        grid: d.grid,
        gridImporting: config.gridPowerSign === "export_positive" ? d.grid < 0 : d.grid > 0,
        gridExporting: config.gridPowerSign === "export_positive" ? d.grid > 0 : d.grid < 0,
        gridAbs: Math.abs(d.grid),
        home: d.home,
        solarToday: d.solarToday,
        homeToday: d.homeToday,
        batteryToday: d.batteryToday,
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

    // Home consumption — either provided or derived
    let home = num(getState, config.homePowerEntity);
    if (home === null) {
      const fromGrid = gridImporting ? gridAbs : 0;
      const fromBat = batteryDischarging ? batteryAbs : 0;
      const toGrid = gridExporting ? gridAbs : 0;
      const toBat = batteryCharging ? batteryAbs : 0;
      home = Math.max(0, solar + fromGrid + fromBat - toGrid - toBat);
    }

    return {
      solar,
      battery: batteryRaw,
      batteryCharging,
      batteryDischarging,
      batteryAbs,
      soc,
      grid: gridRaw,
      gridImporting,
      gridExporting,
      gridAbs,
      home,
      solarToday: num(getState, config.solarEnergyTodayEntity),
      homeToday: num(getState, config.homeEnergyTodayEntity),
      batteryToday: null as number | null,
      gridImportToday: num(getState, config.gridImportTodayEntity),
      gridExportToday: num(getState, config.gridExportTodayEntity),
    };
  }, [demoMode, tick, getState, config]);

  // Show nodes only when configured (or always in demo)
  const showSolar = demoMode || !!config.solarPowerEntity;
  const showBattery = demoMode || !!config.batteryPowerEntity || !!config.batterySocEntity;
  const showGrid = demoMode || !!config.gridPowerEntity;

  // Compute flow links
  const flows = useMemo<FlowLink[]>(() => {
    const out: FlowLink[] = [];
    const s = live.solar;
    let pvBudget = s;
    // PV -> battery (charging)
    if (showSolar && showBattery && live.batteryCharging && live.batteryAbs > 5) {
      const p = Math.min(pvBudget, live.batteryAbs);
      if (p > 5) {
        out.push({ from: "solar", to: "battery", power: p, color: colors.solar });
        pvBudget -= p;
      }
    }
    // PV -> grid (exporting)
    if (showSolar && showGrid && live.gridExporting && live.gridAbs > 5) {
      const p = Math.min(pvBudget, live.gridAbs);
      if (p > 5) {
        out.push({ from: "solar", to: "grid", power: p, color: colors.solar });
        pvBudget -= p;
      }
    }
    // PV -> home (remainder)
    if (showSolar && pvBudget > 5) {
      out.push({ from: "solar", to: "home", power: pvBudget, color: colors.solar });
    }
    // Battery -> home (discharging)
    if (showBattery && live.batteryDischarging && live.batteryAbs > 5) {
      out.push({ from: "battery", to: "home", power: live.batteryAbs, color: colors.battery });
    }
    // Grid -> home (importing)
    if (showGrid && live.gridImporting && live.gridAbs > 5) {
      out.push({ from: "grid", to: "home", power: live.gridAbs, color: colors.grid });
    }
    return out;
  }, [live, showSolar, showBattery, showGrid, colors]);

  const showAnimations = config.showAnimations !== false;

  // ── Layout (SVG) — Home in center, Solar top, Grid left, Battery right ──
  // ViewBox 300x200. Node positions:
  const NODE = {
    solar:   { x: 150, y: 30,  icon: "mdi:white-balance-sunny", label: "Solar",   color: colors.solar },
    grid:    { x: 50,  y: 130, icon: "mdi:transmission-tower",  label: "Grid",    color: colors.grid },
    battery: { x: 250, y: 130, icon: "mdi:battery",             label: "Battery", color: colors.battery },
    home:    { x: 150, y: 130, icon: "mdi:home",                label: "Home",    color: colors.home },
  } as const;

  const linkPath = (from: keyof typeof NODE, to: keyof typeof NODE) => {
    const a = NODE[from]; const b = NODE[to];
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  };

  const valFont = fontSizes?.value ?? 16;
  const labelFont = fontSizes?.label ?? 10;

  // Pulse speed scales with power magnitude
  const animDur = (w: number) => {
    const clamped = Math.max(50, Math.min(5000, w));
    return `${(3.5 - (clamped / 5000) * 2.8).toFixed(2)}s`;
  };

  return (
    <div className="widget-card h-full flex flex-col">
      {config.label && (
        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
          {config.label}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Flow links */}
          <g>
            {flows.map((f, i) => (
              <g key={i}>
                <path
                  d={linkPath(f.from, f.to)}
                  stroke={f.color}
                  strokeOpacity={0.25}
                  strokeWidth={2}
                  fill="none"
                />
                {showAnimations && (
                  <circle r={3} fill={f.color}>
                    <animateMotion
                      dur={animDur(f.power)}
                      repeatCount="indefinite"
                      path={linkPath(f.from, f.to)}
                    />
                  </circle>
                )}
              </g>
            ))}
            {/* Inactive (idle) links — drawn faintly to show topology */}
            {showSolar && !flows.some((f) => f.from === "solar") && (
              <path d={linkPath("solar", "home")} stroke="hsl(var(--border))" strokeOpacity={0.25} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
            {showBattery && !flows.some((f) => f.from === "battery" || f.to === "battery") && (
              <path d={linkPath("battery", "home")} stroke="hsl(var(--border))" strokeOpacity={0.25} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
            {showGrid && !flows.some((f) => f.from === "grid" || f.to === "grid") && (
              <path d={linkPath("grid", "home")} stroke="hsl(var(--border))" strokeOpacity={0.25} strokeWidth={1} fill="none" strokeDasharray="2 3" />
            )}
          </g>

          {/* Nodes (rendered as foreignObject would over-complicate; use circle + label) */}
          {(["solar", "grid", "battery", "home"] as const).map((k) => {
            const show = k === "home" ? true : k === "solar" ? showSolar : k === "grid" ? showGrid : showBattery;
            if (!show) return null;
            const n = NODE[k];
            return (
              <g key={k}>
                <circle cx={n.x} cy={n.y} r={22} fill="hsl(var(--card))" stroke={n.color} strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>

        {/* HTML overlay for icons + values (better text rendering than SVG <text>) */}
        <div className="absolute inset-0 pointer-events-none">
          {(["solar", "grid", "battery", "home"] as const).map((k) => {
            const show = k === "home" ? true : k === "solar" ? showSolar : k === "grid" ? showGrid : showBattery;
            if (!show) return null;
            const n = NODE[k];
            let power = 0;
            let sublabel = "";
            if (k === "solar") {
              power = live.solar;
              sublabel = formatEnergy(live.solarToday);
            } else if (k === "grid") {
              power = live.gridAbs;
              sublabel = live.gridImporting ? "Import" : live.gridExporting ? "Export" : "Idle";
            } else if (k === "battery") {
              power = live.batteryAbs;
              const socStr = live.soc !== null && live.soc !== undefined ? `${Math.round(live.soc)}%` : "";
              const dir = live.batteryCharging ? "Charging" : live.batteryDischarging ? "Discharging" : "Idle";
              sublabel = socStr ? `${socStr} · ${dir}` : dir;
            } else {
              power = live.home;
              sublabel = formatEnergy(live.homeToday);
            }
            const p = formatPower(power);
            // Convert SVG coords (300x200) to %.
            const leftPct = (n.x / 300) * 100;
            const topPct = (n.y / 200) * 100;
            return (
              <div
                key={k}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
                style={{ left: `${leftPct}%`, top: `${topPct}%`, width: 92 }}
              >
                <Icon icon={n.icon} style={{ color: n.color, width: 20, height: 20 }} />
                <div style={{ color: n.color, fontSize: Math.max(11, valFont - 2), fontWeight: 600, lineHeight: 1.05 }}>
                  {p.value}<span style={{ fontSize: labelFont, marginLeft: 2, opacity: 0.85 }}>{p.unit}</span>
                </div>
                <div className="text-muted-foreground" style={{ fontSize: labelFont, lineHeight: 1.1 }}>
                  {sublabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: today totals */}
      {(config.showDayTotals !== false) && (
        <div className="mt-1 pt-1 border-t border-border/30 grid grid-cols-3 gap-1 text-center" style={{ fontSize: labelFont }}>
          <div>
            <div className="text-muted-foreground">Solar</div>
            <div style={{ color: colors.solar, fontWeight: 600 }}>{formatEnergy(live.solarToday)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Import</div>
            <div style={{ color: colors.grid, fontWeight: 600 }}>{formatEnergy(live.gridImportToday)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Export</div>
            <div style={{ color: colors.solar, fontWeight: 600, opacity: 0.85 }}>{formatEnergy(live.gridExportToday)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
