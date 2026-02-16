import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, GeneralSensorConfig } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { GeneralSensorLiveData } from "@/components/GeneralSensorWidget";

export function useGeneralSensorData(config: DashboardConfig) {
  const [dataMap, setDataMap] = useState<Record<string, GeneralSensorLiveData>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const sensors = config.generalSensors || [];
    if (sensors.length === 0) {
      setDataMap({});
      setLoading(false);
      return;
    }

    const isDemo = !checkConfigured(config);

    if (isDemo) {
      // Generate mock data for each sensor card
      const mock: Record<string, GeneralSensorLiveData> = {};
      for (const sc of sensors) {
        const topValues = sc.topInfo.map((ti) => ({
          label: ti.label,
          value: (Math.random() * 100).toFixed(1),
          unit: ti.unit,
          color: ti.color,
        }));
        const bottomValues = sc.bottomInfo.map((bi) => ({
          label: bi.label,
          value: (Math.random() * 50).toFixed(1),
          unit: bi.unit,
          color: bi.color,
        }));
        const chartData: Record<string, number | string>[] = [];
        if (sc.showGraph && sc.chartSeries.length > 0) {
          for (let i = 0; i < 24; i++) {
            const point: Record<string, number | string> = {
              time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            };
            sc.chartSeries.forEach((cs, idx) => {
              point[`series_${idx}`] = 20 + Math.sin(i / 3 + idx) * 10 + Math.random() * 5;
            });
            chartData.push(point);
          }
        }
        const chartSeriesMeta = sc.chartSeries.map((cs, idx) => ({
          dataKey: `series_${idx}`,
          label: cs.label,
          color: cs.color,
          chartType: cs.chartType,
        }));
        mock[sc.id] = { topValues, bottomValues, chartData, chartSeriesMeta };
      }
      setDataMap(mock);
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const result: Record<string, GeneralSensorLiveData> = {};

      for (const sc of sensors) {
        // Fetch top info
        const topValues = await Promise.all(
          sc.topInfo.map(async (ti) => {
            try {
              const state = await client.getState(ti.entityId);
              return { label: ti.label, value: state.state, unit: ti.unit || state.attributes?.unit_of_measurement || "", color: ti.color };
            } catch {
              return { label: ti.label, value: "—", unit: ti.unit, color: ti.color };
            }
          })
        );

        // Fetch bottom info
        const bottomValues = await Promise.all(
          sc.bottomInfo.map(async (bi) => {
            try {
              const state = await client.getState(bi.entityId);
              return { label: bi.label, value: state.state, unit: bi.unit || state.attributes?.unit_of_measurement || "", color: bi.color };
            } catch {
              return { label: bi.label, value: "—", unit: bi.unit, color: bi.color };
            }
          })
        );

        // Fetch chart history
        let chartData: Record<string, number | string>[] = [];
        const chartSeriesMeta = sc.chartSeries.map((cs, idx) => ({
          dataKey: `series_${idx}`,
          label: cs.label,
          color: cs.color,
          chartType: cs.chartType,
        }));

        if (sc.showGraph && sc.chartSeries.length > 0) {
          const now = new Date();
          const start = new Date(now.getTime() - sc.historyHours * 3600000);

          const histories = await Promise.all(
            sc.chartSeries.map(async (cs) => {
              try {
                const raw = await client.getHistory(cs.entityId, start.toISOString(), now.toISOString());
                return raw?.[0] || [];
              } catch {
                return [];
              }
            })
          );

          // Merge histories by time — use the first series as time base, sample ~60 points
          const primaryHistory = histories[0] || [];
          const step = Math.max(1, Math.floor(primaryHistory.length / 60));
          const sampledPrimary = primaryHistory.filter((_, i) => i % step === 0);

          chartData = sampledPrimary.map((s, pointIdx) => {
            const point: Record<string, number | string> = {
              time: s.last_updated || s.last_changed,
            };
            // For primary series
            point["series_0"] = parseFloat(s.state) || 0;
            // For additional series, find closest time
            for (let seriesIdx = 1; seriesIdx < histories.length; seriesIdx++) {
              const h = histories[seriesIdx];
              const targetIdx = Math.min(pointIdx * step, h.length - 1);
              point[`series_${seriesIdx}`] = targetIdx >= 0 ? (parseFloat(h[targetIdx]?.state) || 0) : 0;
            }
            return point;
          });
        }

        result[sc.id] = { topValues, bottomValues, chartData, chartSeriesMeta };
      }

      setDataMap(result);
    } catch (err) {
      console.error("Failed to fetch general sensor data:", err);
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
