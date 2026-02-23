import { useState, useEffect, useCallback } from "react";
import type { PollenConfig, PollenSensorConfig } from "@/lib/config";

export interface PollenLevel {
  entityId: string;
  label: string;
  icon: string;
  color: string;
  state: string; // current level text e.g. "Low", "Moderate"
  numericState: number; // numeric level 0-6
  forecast: { date: string; level: string; numericLevel: number }[];
}

export interface PollenData {
  sensors: PollenLevel[];
}

const POLLEN_LEVEL_MAP: Record<string, number> = {
  "i.u.": -1,
  "inga halter": 0,
  "låga halter": 1,
  "låga-måttliga halter": 2,
  "måttliga halter": 3,
  "måttliga-höga halter": 4,
  "höga halter": 5,
  "mycket höga halter": 6,
  // English fallbacks
  "none": 0,
  "low": 1,
  "moderate": 2,
  "high": 3,
  "very high": 4,
};

function parsePollenLevel(state: string): number {
  const lower = state.toLowerCase().trim();
  if (POLLEN_LEVEL_MAP[lower] !== undefined) return POLLEN_LEVEL_MAP[lower];
  const num = parseFloat(state);
  if (!isNaN(num)) return Math.round(num);
  return -1;
}

export function usePollenData(
  config: PollenConfig | undefined,
  getCachedState: (entityId: string) => any,
  onStateChange: (cb: (entityId: string, newState: any) => void) => () => void,
): { pollenData: PollenData; loading: boolean } {
  const [pollenData, setPollenData] = useState<PollenData>({ sensors: [] });
  const [loading, setLoading] = useState(true);

  const buildData = useCallback(() => {
    if (!config || config.sensors.length === 0) {
      setPollenData({ sensors: [] });
      setLoading(false);
      return;
    }

    const sensors: PollenLevel[] = config.sensors.map((sensor) => {
      const haState = getCachedState(sensor.entityId);
      const state = haState?.state || "unknown";
      const numericState = parsePollenLevel(state);
      const attrs = haState?.attributes || {};

      // Parse forecast from attributes (pollenprognos stores forecast in attributes)
      const forecast: { date: string; level: string; numericLevel: number }[] = [];
      
      // The pollenprognos integration stores forecast as day_X attributes
      for (let i = 0; i <= (config.forecastDays ?? 4); i++) {
        const dayKey = `day_${i}`;
        if (attrs[dayKey] !== undefined) {
          const level = String(attrs[dayKey]);
          const dateKey = `day_${i}_date`;
          const date = attrs[dateKey] || "";
          forecast.push({ date, level, numericLevel: parsePollenLevel(level) });
        }
      }

      // Also check for "forecast" array attribute (polleninformation integration)
      if (attrs.forecast && Array.isArray(attrs.forecast)) {
        for (const entry of attrs.forecast.slice(0, config.forecastDays ?? 4)) {
          forecast.push({
            date: entry.date || entry.datetime || "",
            level: entry.state || entry.level || String(entry.value ?? ""),
            numericLevel: parsePollenLevel(String(entry.state ?? entry.level ?? entry.value ?? "")),
          });
        }
      }

      return {
        entityId: sensor.entityId,
        label: sensor.label,
        icon: sensor.icon,
        color: sensor.color,
        state,
        numericState,
        forecast: forecast.slice(0, config.forecastDays || 4),
      };
    });

    setPollenData({ sensors });
    setLoading(false);
  }, [config, getCachedState]);

  useEffect(() => {
    buildData();
  }, [buildData]);

  useEffect(() => {
    if (!config || config.sensors.length === 0) return;
    const entityIds = config.sensors.map((s) => s.entityId);
    const unsub = onStateChange((entityId) => {
      if (entityIds.includes(entityId)) {
        buildData();
      }
    });
    return unsub;
  }, [config, onStateChange, buildData]);

  return { pollenData, loading };
}
