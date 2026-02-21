import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, type HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { SensorGridLiveData } from "@/components/SensorGridWidget";
import type { GetCachedState, OnStateChange } from "@/hooks/useDashboardData";

export function useSensorGridData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [dataMap, setDataMap] = useState<Record<string, SensorGridLiveData>>({});
  const [loading, setLoading] = useState(true);

  const updateFromCache = useCallback(() => {
    const grids = config.sensorGrids || [];
    if (grids.length === 0) { setDataMap({}); setLoading(false); return; }
    if (!checkConfigured(config) || !getCachedState) return;

    const result: Record<string, SensorGridLiveData> = {};
    for (const grid of grids) {
      const values = grid.cells.map((cell) => {
        if (!cell.entityId) return { value: "", unit: cell.unit };
        const state = getCachedState(cell.entityId);
        if (state) {
          return { value: state.state, unit: cell.unit || state.attributes?.unit_of_measurement || "" };
        }
        return { value: "—", unit: cell.unit };
      });
      result[grid.id] = { values };
    }
    setDataMap(result);
    setLoading(false);
  }, [config, getCachedState]);

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
          })),
        };
      }
      setDataMap(mock);
      setLoading(false);
      return;
    }

    updateFromCache();

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
                return { value: state.state, unit: cell.unit || state.attributes?.unit_of_measurement || "" };
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
  }, [config, getCachedState, updateFromCache]);

  // WS listener
  useEffect(() => {
    if (!onStateChange || !checkConfigured(config)) return;
    const entityIds = new Set<string>();
    for (const grid of (config.sensorGrids || [])) {
      for (const cell of grid.cells) {
        if (cell.entityId) entityIds.add(cell.entityId);
      }
    }
    if (entityIds.size === 0) return;
    const unsubscribe = onStateChange((entityId) => {
      if (entityIds.has(entityId)) updateFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { dataMap, loading };
}
