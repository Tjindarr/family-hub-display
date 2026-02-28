import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardConfig, isConfigured as checkConfigured, type HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { SensorGridLiveData } from "@/components/SensorGridWidget";
import type { GetCachedState, OnStateChange } from "@/hooks/useDashboardData";
import { resolveEntityValue, parseEntityRef } from "@/lib/entity-resolver";

export function useSensorGridData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [dataMap, setDataMap] = useState<Record<string, SensorGridLiveData>>({});
  const [loading, setLoading] = useState(true);
  const historyRef = useRef<Record<string, { time: string; value: number }[]>>({});

  const updateFromCache = useCallback(() => {
    const grids = config.sensorGrids || [];
    if (grids.length === 0) { setDataMap({}); setLoading(false); return; }
    if (!checkConfigured(config) || !getCachedState) return;

    const result: Record<string, SensorGridLiveData> = {};
    for (const grid of grids) {
      const values = grid.cells.map((cell) => {
        if (!cell.entityId) return { value: "", unit: cell.unit };
        const resolved = resolveEntityValue(cell.entityId, getCachedState);
        if (resolved.value !== null) {
          return {
            value: resolved.value,
            unit: cell.unit || resolved.unit || "",
            history: cell.showChart ? historyRef.current[cell.entityId] : undefined,
          };
        }
        return { value: "—", unit: cell.unit, history: cell.showChart ? historyRef.current[cell.entityId] : undefined };
      });
      result[grid.id] = { values };
    }
    setDataMap(result);
    setLoading(false);
  }, [config, getCachedState]);

  const fetchHistory = useCallback(async () => {
    if (!checkConfigured(config)) return;
    const grids = config.sensorGrids || [];
    const chartEntities = new Set<string>();
    for (const grid of grids) {
      for (const cell of grid.cells) {
        if (cell.showChart && cell.entityId) chartEntities.add(cell.entityId);
      }
    }
    if (chartEntities.size === 0) return;

    const client = createHAClient(config);
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 3600000);

    for (const entityId of chartEntities) {
      try {
        const raw = await client.getHistory(entityId, start.toISOString(), now.toISOString());
        if (raw?.[0]) {
          const numericPoints = raw[0].filter((s: any) => !isNaN(parseFloat(s.state)));
          const step = Math.max(1, Math.floor(numericPoints.length / 60));
          historyRef.current[entityId] = numericPoints
            .filter((_: any, i: number) => i % step === 0)
            .map((s: any) => ({ time: s.last_changed, value: parseFloat(s.state) }));
        }
      } catch {
        // ignore individual failures
      }
    }
    updateFromCache();
  }, [config, updateFromCache]);

  const fetchData = useCallback(async () => {
    const grids = config.sensorGrids || [];
    if (grids.length === 0) { setDataMap({}); setLoading(false); return; }

    if (!checkConfigured(config)) {
      const mock: Record<string, SensorGridLiveData> = {};
      for (const grid of grids) {
        mock[grid.id] = {
          values: grid.cells.map((cell) => ({
            value: cell.entityId ? (Math.random() * 100).toFixed(1) : "",
            unit: cell.unit,
            history: cell.showChart
              ? Array.from({ length: 48 }, (_, i) => ({
                  time: new Date(Date.now() - (47 - i) * 30 * 60000).toISOString(),
                  value: 15 + Math.random() * 10,
                }))
              : undefined,
          })),
        };
      }
      setDataMap(mock);
      setLoading(false);
      return;
    }

    updateFromCache();
    await fetchHistory();

    // Fallback: fetch individually if cache is empty
    if (!getCachedState) {
      try {
        const client = createHAClient(config);
        const result: Record<string, SensorGridLiveData> = {};
        for (const grid of grids) {
          const values = await Promise.all(
            grid.cells.map(async (cell) => {
              if (!cell.entityId) return { value: "", unit: cell.unit };
              try {
                const state = await client.getState(cell.entityId);
                return {
                  value: state.state,
                  unit: cell.unit || state.attributes?.unit_of_measurement || "",
                  history: cell.showChart ? historyRef.current[cell.entityId] : undefined,
                };
              } catch {
                return { value: "—", unit: cell.unit };
              }
            })
          );
          result[grid.id] = { values };
        }
        setDataMap(result);
      } catch (err) {
        console.error("Failed to fetch sensor grid data:", err);
      } finally {
        setLoading(false);
      }
    }
  }, [config, getCachedState, updateFromCache, fetchHistory]);

  // WS listener
  useEffect(() => {
    if (!onStateChange || !checkConfigured(config)) return;
    const entityIds = new Set<string>();
    for (const grid of (config.sensorGrids || [])) {
      for (const cell of grid.cells) {
        if (cell.entityId) entityIds.add(parseEntityRef(cell.entityId).entityId);
      }
    }
    if (entityIds.size === 0) return;
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityIds.has(entityId)) updateFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // History refresh every 5 min
  useEffect(() => {
    if (!checkConfigured(config)) return;
    const hasCharts = (config.sensorGrids || []).some((g) => g.cells.some((c) => c.showChart));
    if (!hasCharts) return;
    const interval = setInterval(fetchHistory, 300000);
    return () => clearInterval(interval);
  }, [fetchHistory, config]);

  return { dataMap, loading };
}
