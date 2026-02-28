import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, GeneralSensorConfig, ChartGrouping, ChartAggregation, type HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { GeneralSensorLiveData } from "@/components/GeneralSensorWidget";
import type { GetCachedState, OnStateChange } from "@/hooks/useDashboardData";
import { resolveEntityValue, parseEntityRef } from "@/lib/entity-resolver";

function getBucketKey(iso: string, grouping: ChartGrouping): string {
  const d = new Date(iso);
  if (grouping === "day") return d.toLocaleDateString("sv-SE");
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
    if (!buckets.has(key)) buckets.set(key, { values: {}, first: {}, last: {} });
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
        case "max": point[k] = Math.max(...vals); break;
        case "min": point[k] = Math.min(...vals); break;
        case "sum": point[k] = vals.reduce((a, v) => a + v, 0); break;
        case "last": point[k] = b.last[k] ?? 0; break;
        case "delta": {
          const currentLast = b.last[k] ?? 0;
          point[k] = eIdx > 0 ? currentLast - (entries[eIdx - 1][1].last[k] ?? 0) : currentLast - (b.first[k] ?? 0);
          break;
        }
        case "average": default:
          point[k] = vals.reduce((a, v) => a + v, 0) / vals.length; break;
      }
    }
    result.push(point);
  }
  return result;
}

async function fetchHistoryChart(
  client: ReturnType<typeof createHAClient>,
  sc: GeneralSensorConfig,
  start: Date,
  now: Date,
  aggregation: ChartAggregation,
  grouping: ChartGrouping,
  getCachedState?: GetCachedState
): Promise<Record<string, number | string>[]> {
  const [histories, currentStates] = await Promise.all([
    Promise.all(sc.chartSeries.map(async (cs) => {
      try {
        const raw = await client.getHistory(cs.entityId, start.toISOString(), now.toISOString());
        return raw?.[0] || [];
      } catch { return []; }
    })),
    Promise.all(sc.chartSeries.map(async (cs) => {
      try {
        return getCachedState?.(cs.entityId) || await client.getState(cs.entityId);
      } catch { return null; }
    })),
  ]);

  const timeMap = new Map<string, Record<string, number | string>>();
  for (let seriesIdx = 0; seriesIdx < histories.length; seriesIdx++) {
    for (const entry of histories[seriesIdx]) {
      const ts = entry.last_updated || entry.last_changed;
      if (!ts) continue;
      const val = parseFloat(entry.state);
      if (isNaN(val)) continue;
      if (!timeMap.has(ts)) timeMap.set(ts, { time: ts });
      timeMap.get(ts)![`series_${seriesIdx}`] = val;
    }
    const curState = currentStates[seriesIdx];
    if (curState) {
      const curVal = parseFloat(curState.state);
      if (!isNaN(curVal)) {
        const curTs = now.toISOString();
        if (!timeMap.has(curTs)) timeMap.set(curTs, { time: curTs });
        timeMap.get(curTs)![`series_${seriesIdx}`] = curVal;
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
      if (typeof point[k] === "number") lastKnown[k] = point[k] as number;
      else point[k] = lastKnown[k] ?? 0;
    }
  }
  return aggregateByGrouping(sorted, grouping, histories.length, aggregation);
}

export function useGeneralSensorData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [dataMap, setDataMap] = useState<Record<string, GeneralSensorLiveData>>({});
  const [loading, setLoading] = useState(true);

  // Update top/bottom info values from cache (no API calls)
  const updateInfoFromCache = useCallback(() => {
    const sensors = config.generalSensors || [];
    if (sensors.length === 0 || !checkConfigured(config) || !getCachedState) return;

    setDataMap((prev) => {
      const result: Record<string, GeneralSensorLiveData> = {};
      for (const sc of sensors) {
        const topValues = sc.topInfo.map((ti) => {
          const resolved = resolveEntityValue(ti.entityId, getCachedState);
          if (resolved.value !== null) return { label: ti.label, value: resolved.value, unit: ti.unit || resolved.unit || "", color: ti.color };
          return { label: ti.label, value: prev[sc.id]?.topValues?.find((v) => v.label === ti.label)?.value || "—", unit: ti.unit, color: ti.color };
        });
        const bottomValues = sc.bottomInfo.map((bi) => {
          const resolved = resolveEntityValue(bi.entityId, getCachedState);
          if (resolved.value !== null) return { label: bi.label, value: resolved.value, unit: bi.unit || resolved.unit || "", color: bi.color };
          return { label: bi.label, value: prev[sc.id]?.bottomValues?.find((v) => v.label === bi.label)?.value || "—", unit: bi.unit, color: bi.color };
        });
        const chartSeriesMeta = sc.chartSeries.map((cs, idx) => ({
          dataKey: `series_${idx}`, label: cs.label, color: cs.color, chartType: cs.chartType,
        }));
        result[sc.id] = {
          topValues,
          bottomValues,
          chartData: prev[sc.id]?.chartData || [],
          chartSeriesMeta,
        };
      }
      return result;
    });
    setLoading(false);
  }, [config, getCachedState]);

  // Fetch chart history data via REST
  const fetchChartData = useCallback(async () => {
    const sensors = config.generalSensors || [];
    if (sensors.length === 0 || !checkConfigured(config)) return;

    const client = createHAClient(config);
    const chartUpdates: Record<string, Record<string, number | string>[]> = {};

    for (const sc of sensors) {
      if (!sc.showGraph || sc.chartSeries.length === 0) continue;
      const now = new Date();
      const grouping = sc.chartGrouping || "hour";
      const aggregation = sc.chartAggregation || "average";
      let start: Date;
      if (grouping === "day") {
        const totalDays = Math.max(Math.ceil(sc.historyHours / 24), 7);
        const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
        start = new Date(todayMidnight.getTime() - (totalDays - 1) * 24 * 3600000);
      } else {
        start = new Date(now.getTime() - sc.historyHours * 3600000);
      }
      chartUpdates[sc.id] = await fetchHistoryChart(client, sc, start, now, aggregation, grouping, getCachedState);
    }

    setDataMap((prev) => {
      const result = { ...prev };
      for (const [id, chartData] of Object.entries(chartUpdates)) {
        if (result[id]) {
          result[id] = { ...result[id], chartData };
        }
      }
      return result;
    });
  }, [config, getCachedState]);

  const fetchData = useCallback(async () => {
    const sensors = config.generalSensors || [];
    if (sensors.length === 0) { setDataMap({}); setLoading(false); return; }

    if (!checkConfigured(config)) {
      const mock: Record<string, GeneralSensorLiveData> = {};
      for (const sc of sensors) {
        const topValues = sc.topInfo.map((ti) => ({ label: ti.label, value: (Math.random() * 100).toFixed(1), unit: ti.unit, color: ti.color }));
        const bottomValues = sc.bottomInfo.map((bi) => ({ label: bi.label, value: (Math.random() * 50).toFixed(1), unit: bi.unit, color: bi.color }));
        const chartData: Record<string, number | string>[] = [];
        if (sc.showGraph && sc.chartSeries.length > 0) {
          for (let i = 0; i < 24; i++) {
            const point: Record<string, number | string> = { time: new Date(Date.now() - (23 - i) * 3600000).toISOString() };
            sc.chartSeries.forEach((cs, idx) => { point[`series_${idx}`] = 20 + Math.sin(i / 3 + idx) * 10 + Math.random() * 5; });
            chartData.push(point);
          }
        }
        const chartSeriesMeta = sc.chartSeries.map((cs, idx) => ({ dataKey: `series_${idx}`, label: cs.label, color: cs.color, chartType: cs.chartType }));
        mock[sc.id] = { topValues, bottomValues, chartData, chartSeriesMeta };
      }
      setDataMap(mock);
      setLoading(false);
      return;
    }

    updateInfoFromCache();
    await fetchChartData();
  }, [config, updateInfoFromCache, fetchChartData]);

  // WS listener for info values
  useEffect(() => {
    if (!onStateChange || !checkConfigured(config)) return;
    const entityIds = new Set<string>();
    for (const sc of (config.generalSensors || [])) {
      for (const ti of sc.topInfo) entityIds.add(parseEntityRef(ti.entityId).entityId);
      for (const bi of sc.bottomInfo) entityIds.add(parseEntityRef(bi.entityId).entityId);
    }
    if (entityIds.size === 0) return;
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityIds.has(entityId)) updateInfoFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateInfoFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Chart data refresh every 5 min
  useEffect(() => {
    if (!checkConfigured(config)) return;
    const hasCharts = (config.generalSensors || []).some((s) => s.showGraph && s.chartSeries.length > 0);
    if (!hasCharts) return;
    const interval = setInterval(fetchChartData, 300000);
    return () => clearInterval(interval);
  }, [fetchChartData, config]);

  return { dataMap, loading };
}
