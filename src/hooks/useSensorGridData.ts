import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { SensorGridLiveData } from "@/components/SensorGridWidget";

export function useSensorGridData(config: DashboardConfig) {
  const [dataMap, setDataMap] = useState<Record<string, SensorGridLiveData>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const grids = config.sensorGrids || [];
    if (grids.length === 0) {
      setDataMap({});
      setLoading(false);
      return;
    }

    const isDemo = !checkConfigured(config);

    if (isDemo) {
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
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { dataMap, loading };
}
