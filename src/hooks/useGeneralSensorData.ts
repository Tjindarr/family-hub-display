import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, GeneralSensorConfig, ChartGrouping, ChartAggregation } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { GeneralSensorLiveData } from "@/components/GeneralSensorWidget";

function getBucketKey(iso: string, grouping: ChartGrouping): string {
  const d = new Date(iso);
  // Use sv-SE locale to bucket in Swedish local time
  if (grouping === "day") {
    return d.toLocaleDateString("sv-SE"); // "2025-02-17"
  }
  if (grouping === "minute") {
    const date = d.toLocaleDateString("sv-SE");
    const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date}T${time}`;
  }
  // hour
  const date = d.toLocaleDateString("sv-SE");
  const hour = d.toLocaleTimeString("sv-SE", { hour: "2-digit", hour12: false });
  return `${date}T${hour}:00`;
}

function aggregateByGrouping(
  points: Record<string, number | string>[],
  grouping: ChartGrouping,
  seriesCount: number,
  aggregation: ChartAggregation = "average"
): Record<string, number | string>[] {
  if (points.length === 0) return [];
  const buckets = new Map<string, { values: Record<string, number[]>; last: Record<string, number> }>();
  for (const p of points) {
    const key = getBucketKey(String(p.time), grouping);
    if (!buckets.has(key)) {
      buckets.set(key, { values: {}, last: {} });
    }
    const b = buckets.get(key)!;
    for (let i = 0; i < seriesCount; i++) {
      const k = `series_${i}`;
      const val = typeof p[k] === "number" ? (p[k] as number) : 0;
      if (!b.values[k]) b.values[k] = [];
      b.values[k].push(val);
      b.last[k] = val;
    }
  }
  return Array.from(buckets.entries()).map(([time, b]) => {
    const point: Record<string, number | string> = { time };
    for (let i = 0; i < seriesCount; i++) {
      const k = `series_${i}`;
      const vals = b.values[k] || [0];
      switch (aggregation) {
        case "max":
          point[k] = Math.max(...vals);
          break;
        case "min":
          point[k] = Math.min(...vals);
          break;
        case "sum":
          point[k] = vals.reduce((a, v) => a + v, 0);
          break;
        case "last":
          point[k] = b.last[k] ?? 0;
          break;
        case "average":
        default:
          point[k] = vals.reduce((a, v) => a + v, 0) / vals.length;
          break;
      }
    }
    return point;
  });
}

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
          // For day grouping, fetch at least 7 days regardless of historyHours
          const grouping = sc.chartGrouping || "hour";
          const minHours = grouping === "day" ? Math.max(sc.historyHours, 168) : sc.historyHours;
          const start = new Date(now.getTime() - minHours * 3600000);

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

          // Build a unified timeline from ALL series timestamps
          const timeMap = new Map<string, Record<string, number | string>>();

          for (let seriesIdx = 0; seriesIdx < histories.length; seriesIdx++) {
            const h = histories[seriesIdx];
            for (const entry of h) {
              const ts = entry.last_updated || entry.last_changed;
              if (!ts) continue;
              const val = parseFloat(entry.state);
              if (isNaN(val)) continue;
              const key = `series_${seriesIdx}`;
              if (!timeMap.has(ts)) {
                timeMap.set(ts, { time: ts });
              }
              timeMap.get(ts)![key] = val;
            }
          }

          // Sort by time and forward-fill missing series values
          const sorted = Array.from(timeMap.values()).sort(
            (a, b) => new Date(String(a.time)).getTime() - new Date(String(b.time)).getTime()
          );
          const lastKnown: Record<string, number> = {};
          for (const point of sorted) {
            for (let i = 0; i < histories.length; i++) {
              const k = `series_${i}`;
              if (typeof point[k] === "number") {
                lastKnown[k] = point[k] as number;
              } else {
                point[k] = lastKnown[k] ?? 0;
              }
            }
          }

          // Aggregate by grouping (uses all raw points for accurate bucketing)
          chartData = aggregateByGrouping(sorted, grouping, histories.length, sc.chartAggregation || "average");
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
