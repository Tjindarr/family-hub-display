import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, GeneralSensorConfig, ChartGrouping, ChartAggregation } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { GeneralSensorLiveData } from "@/components/GeneralSensorWidget";

function getBucketKey(iso: string, grouping: ChartGrouping): string {
  const d = new Date(iso);
  if (grouping === "day") {
    return d.toLocaleDateString("sv-SE");
  }
  if (grouping === "minute") {
    const date = d.toLocaleDateString("sv-SE");
    const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date}T${time}`;
  }
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
  const buckets = new Map<string, { values: Record<string, number[]>; first: Record<string, number>; last: Record<string, number> }>();
  for (const p of points) {
    const key = getBucketKey(String(p.time), grouping);
    if (!buckets.has(key)) {
      buckets.set(key, { values: {}, first: {}, last: {} });
    }
    const b = buckets.get(key)!;
    for (let i = 0; i < seriesCount; i++) {
      const k = `series_${i}`;
      const val = typeof p[k] === "number" ? (p[k] as number) : 0;
      if (!b.values[k]) b.values[k] = [];
      b.values[k].push(val);
      if (!(k in b.first)) b.first[k] = val;
      b.last[k] = val;
    }
  }
  const entries = Array.from(buckets.entries());
  const result: Record<string, number | string>[] = [];

  for (let eIdx = 0; eIdx < entries.length; eIdx++) {
    const [time, b] = entries[eIdx];
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
        case "delta": {
          const currentLast = b.last[k] ?? 0;
          if (eIdx > 0) {
            const prevBucket = entries[eIdx - 1][1];
            const prevLast = prevBucket.last[k] ?? 0;
            point[k] = currentLast - prevLast;
          } else {
            point[k] = currentLast - (b.first[k] ?? 0);
          }
          break;
        }
        case "average":
        default:
          point[k] = vals.reduce((a, v) => a + v, 0) / vals.length;
          break;
      }
    }
    result.push(point);
  }

  if (aggregation === "delta") {
    console.log("[Delta] Browser timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("[Delta] Buckets:", JSON.stringify(entries.map(([key, b]) => ({
      b: key,
      f: Math.round((b.first["series_0"] ?? 0) * 100) / 100,
      l: Math.round((b.last["series_0"] ?? 0) * 100) / 100,
      n: b.values["series_0"]?.length || 0,
    }))));
    console.log("[Delta] Deltas:", JSON.stringify(result.map(r => ({
      d: r.time,
      v: typeof r.series_0 === "number" ? Math.round(r.series_0 * 100) / 100 : r.series_0,
    }))));
  }

  return result;
}

/** Fetch chart data using the regular history API */
async function fetchHistoryChart(
  client: ReturnType<typeof createHAClient>,
  sc: GeneralSensorConfig,
  start: Date,
  now: Date,
  aggregation: ChartAggregation,
  grouping: ChartGrouping
): Promise<Record<string, number | string>[]> {
  const [histories, currentStates] = await Promise.all([
    Promise.all(
      sc.chartSeries.map(async (cs) => {
        try {
          const raw = await client.getHistory(cs.entityId, start.toISOString(), now.toISOString());
          return raw?.[0] || [];
        } catch {
          return [];
        }
      })
    ),
    Promise.all(
      sc.chartSeries.map(async (cs) => {
        try {
          return await client.getState(cs.entityId);
        } catch {
          return null;
        }
      })
    ),
  ]);

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
    const curState = currentStates[seriesIdx];
    if (curState) {
      const curVal = parseFloat(curState.state);
      if (!isNaN(curVal)) {
        const curTs = now.toISOString();
        const key = `series_${seriesIdx}`;
        if (!timeMap.has(curTs)) {
          timeMap.set(curTs, { time: curTs });
        }
        timeMap.get(curTs)![key] = curVal;
      }
    }
  }

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

  return aggregateByGrouping(sorted, grouping, histories.length, aggregation);
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

        let chartData: Record<string, number | string>[] = [];
        const chartSeriesMeta = sc.chartSeries.map((cs, idx) => ({
          dataKey: `series_${idx}`,
          label: cs.label,
          color: cs.color,
          chartType: cs.chartType,
        }));

        if (sc.showGraph && sc.chartSeries.length > 0) {
          const now = new Date();
          const grouping = sc.chartGrouping || "hour";
          const aggregation = sc.chartAggregation || "average";
          let start: Date;
          if (grouping === "day") {
            const totalDays = Math.max(Math.ceil(sc.historyHours / 24), 7);
            const todayMidnight = new Date(now);
            todayMidnight.setHours(0, 0, 0, 0);
            start = new Date(todayMidnight.getTime() - (totalDays - 1) * 24 * 3600000);
          } else {
            start = new Date(now.getTime() - sc.historyHours * 3600000);
          }

          chartData = await fetchHistoryChart(client, sc, start, now, aggregation, grouping);
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
