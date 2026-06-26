import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardConfig, isConfigured as checkConfigured } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { GetCachedState, OnStateChange } from "@/hooks/useDashboardData";
import type { PowerFlowLiveData } from "@/components/PowerFlowWidget";

const MAX_POINTS = 120;
const DAY_BUCKETS = 96; // 24h / 15min


export function usePowerFlowData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange,
) {
  const [dataMap, setDataMap] = useState<Record<string, PowerFlowLiveData>>({});
  const [loading, setLoading] = useState(true);
  // Per-entity rolling history (kept in ref so we don't re-render on every push)
  const historyRef = useRef<Record<string, { time: number; value: number }[]>>({});
  const initialHistoryFetched = useRef<Set<string>>(new Set());
  // 24h history per entity (sparse, ~96 buckets)
  const dayHistoryRef = useRef<Record<string, { time: number; value: number }[]>>({});
  const dayHistoryFetched = useRef<Set<string>>(new Set());

  const flows = config.powerFlows || [];

  const recompute = useCallback(() => {
    if (flows.length === 0) {
      setDataMap({});
      setLoading(false);
      return;
    }
    const result: Record<string, PowerFlowLiveData> = {};
    for (const flow of flows) {
      const windowMs = (flow.sparklineMinutes || 30) * 60_000;
      const cutoff = Date.now() - windowMs;
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const midnightMs = todayStart.getTime();
      const devices = flow.devices.map((dev) => {
        const hist = (historyRef.current[dev.entityId] || []).filter((p) => p.time >= cutoff);
        const dayHist = dayHistoryRef.current[dev.entityId] || [];
        const current = hist.length ? hist[hist.length - 1].value : 0;
        let energyToday: number | undefined;
        // Prefer an explicit HA "energy today" sensor (kWh) if provided
        if (dev.energyEntityId && getCachedState) {
          const s = getCachedState(dev.energyEntityId);
          const v = parseFloat(s?.state || "");
          if (!isNaN(v)) energyToday = v;
        }
        // Otherwise integrate power samples since midnight (trapezoid → kWh)
        if (energyToday === undefined && flow.showEnergyToday) {
          const pts = dayHist.filter((p) => p.time >= midnightMs);
          if (pts.length >= 2) {
            let wh = 0;
            for (let k = 1; k < pts.length; k++) {
              const dtH = (pts[k].time - pts[k - 1].time) / 3_600_000;
              const avgW = (pts[k].value + pts[k - 1].value) / 2;
              wh += avgW * dtH;
            }
            energyToday = wh / 1000;
          }
        }
        return { entityId: dev.entityId, current, history: hist, dayHistory: dayHist, energyToday };
      });
      const total = devices.reduce((s, d) => s + (d.current || 0), 0);
      // Build aligned-ish total history by bucketing into ~60 buckets
      const buckets = 60;
      const bucketSize = Math.max(1000, Math.floor(windowMs / buckets));
      const totals: Record<number, number> = {};
      for (const d of devices) {
        for (const p of d.history) {
          const bucket = Math.floor(p.time / bucketSize) * bucketSize;
          totals[bucket] = (totals[bucket] || 0) + p.value;
        }
      }
      const totalHistory = Object.entries(totals)
        .map(([t, v]) => ({ time: Number(t), value: v }))
        .sort((a, b) => a.time - b.time);

      // Build stacked 24h series aligned to 15-min buckets
      let dayStacked: Array<Record<string, number>> | undefined;
      if (flow.show24hChart) {
        const dayMs = 24 * 60 * 60_000;
        const dayCutoff = Date.now() - dayMs;
        const bucketMs = Math.floor(dayMs / DAY_BUCKETS);
        const bucketMap: Record<number, Record<string, number>> = {};
        for (const dev of flow.devices) {
          const hist = dayHistoryRef.current[dev.entityId] || [];
          for (const p of hist) {
            if (p.time < dayCutoff) continue;
            const bk = Math.floor(p.time / bucketMs) * bucketMs;
            if (!bucketMap[bk]) bucketMap[bk] = { time: bk };
            // last value wins within a bucket (most recent sample)
            bucketMap[bk][dev.entityId] = p.value;
          }
        }
        // Forward-fill missing buckets per device for stable stacked area
        const sortedBuckets = Object.keys(bucketMap).map(Number).sort((a, b) => a - b);
        const lastSeen: Record<string, number> = {};
        dayStacked = sortedBuckets.map((bk) => {
          const row: Record<string, number> = { time: bk };
          let totalRow = 0;
          for (const dev of flow.devices) {
            if (bucketMap[bk][dev.entityId] !== undefined) {
              lastSeen[dev.entityId] = bucketMap[bk][dev.entityId];
            }
            const v = lastSeen[dev.entityId] || 0;
            row[dev.entityId] = v;
            totalRow += v;
          }
          row.total = totalRow;
          return row;
        });
      }

      result[flow.id] = { devices, total, totalHistory, dayStacked };
    }
    setDataMap(result);
    setLoading(false);
  }, [flows, getCachedState]);

  // Update history from cached state changes
  const pushFromCache = useCallback(
    (entityId: string) => {
      if (!getCachedState) return;
      const s = getCachedState(entityId);
      const v = parseFloat(s?.state || "");
      if (isNaN(v)) return;
      const arr = historyRef.current[entityId] || [];
      const now = Date.now();
      // Throttle pushes: don't push if last push was <2s ago AND value unchanged
      const last = arr[arr.length - 1];
      if (last && now - last.time < 2000 && last.value === v) return;
      arr.push({ time: now, value: v });
      if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
      historyRef.current[entityId] = arr;
      // Also append to 24h history if tracked, throttled to once per minute
      if (dayHistoryFetched.current.has(entityId)) {
        const day = dayHistoryRef.current[entityId] || [];
        const lastDay = day[day.length - 1];
        if (!lastDay || now - lastDay.time >= 60_000) {
          day.push({ time: now, value: v });
          const dayCutoff = now - 24 * 60 * 60_000;
          while (day.length && day[0].time < dayCutoff) day.shift();
          dayHistoryRef.current[entityId] = day;
        }
      }
    },
    [getCachedState],
  );

  // Initial history fetch from HA
  const fetchInitialHistory = useCallback(async () => {
    if (flows.length === 0) return;
    if (!checkConfigured(config)) return;
    const client = createHAClient(config);
    const ids = new Set<string>();
    let maxMinutes = 30;
    for (const flow of flows) {
      maxMinutes = Math.max(maxMinutes, flow.sparklineMinutes || 30);
      for (const d of flow.devices) if (d.entityId) ids.add(d.entityId);
    }
    const now = new Date();
    const start = new Date(now.getTime() - maxMinutes * 60_000);
    await Promise.all(
      Array.from(ids).map(async (eid) => {
        if (initialHistoryFetched.current.has(eid)) return;
        try {
          const raw = await client.getHistory(eid, start.toISOString(), now.toISOString());
          if (raw?.[0]) {
            const points = raw[0]
              .map((s: any) => ({ time: Date.parse(s.last_changed), value: parseFloat(s.state) }))
              .filter((p: any) => !isNaN(p.time) && !isNaN(p.value));
            // Downsample to MAX_POINTS
            const step = Math.max(1, Math.floor(points.length / MAX_POINTS));
            historyRef.current[eid] = points.filter((_: any, i: number) => i % step === 0);
          }
          initialHistoryFetched.current.add(eid);
        } catch {
          /* ignore */
        }
      }),
    );
    recompute();
  }, [config, flows, recompute]);

  // 24h history fetch from HA (only for flows with show24hChart enabled)
  const fetchDayHistory = useCallback(async () => {
    if (flows.length === 0) return;
    if (!checkConfigured(config)) return;
    const ids = new Set<string>();
    for (const flow of flows) {
      if (!flow.show24hChart) continue;
      for (const d of flow.devices) if (d.entityId) ids.add(d.entityId);
    }
    if (ids.size === 0) return;
    const client = createHAClient(config);
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60_000);
    await Promise.all(
      Array.from(ids).map(async (eid) => {
        try {
          const raw = await client.getHistory(eid, start.toISOString(), now.toISOString());
          if (raw?.[0]) {
            const points = raw[0]
              .map((s: any) => ({ time: Date.parse(s.last_changed), value: parseFloat(s.state) }))
              .filter((p: any) => !isNaN(p.time) && !isNaN(p.value));
            const step = Math.max(1, Math.floor(points.length / (DAY_BUCKETS * 2)));
            dayHistoryRef.current[eid] = points.filter((_: any, i: number) => i % step === 0);
          }
          dayHistoryFetched.current.add(eid);
        } catch {
          /* ignore */
        }
      }),
    );
    recompute();
  }, [config, flows, recompute]);

  // Re-fetch initial history if new entities are added
  useEffect(() => {
    fetchInitialHistory();
  }, [fetchInitialHistory]);

  // 24h history: fetch on mount and refresh every 15 min; also append live points
  useEffect(() => {
    fetchDayHistory();
    const t = setInterval(fetchDayHistory, 15 * 60_000);
    return () => clearInterval(t);
  }, [fetchDayHistory]);


  // Seed from any already-cached states & recompute
  useEffect(() => {
    if (!getCachedState) return;
    for (const flow of flows) {
      for (const d of flow.devices) {
        if (d.entityId) pushFromCache(d.entityId);
      }
    }
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCachedState, JSON.stringify(flows.map((f) => f.devices.map((d) => d.entityId)))]);

  // WS subscription
  useEffect(() => {
    if (!onStateChange) return;
    const ids = new Set<string>();
    for (const flow of flows) {
      for (const d of flow.devices) if (d.entityId) ids.add(d.entityId);
      for (const d of flow.devices) if (d.energyEntityId) ids.add(d.energyEntityId);
    }
    if (ids.size === 0) return;
    const unsub = onStateChange((entityId) => {
      if (entityId === "__bulk_load__") {
        for (const id of ids) pushFromCache(id);
        recompute();
        return;
      }
      if (ids.has(entityId)) {
        pushFromCache(entityId);
        recompute();
      }
    });
    return unsub;
  }, [onStateChange, flows, pushFromCache, recompute]);

  // Periodic recompute so sparkline window slides even without state changes
  useEffect(() => {
    if (flows.length === 0) return;
    const t = setInterval(recompute, 15_000);
    return () => clearInterval(t);
  }, [flows, recompute]);

  // Demo mode: synthesize values if HA is not configured
  useEffect(() => {
    if (checkConfigured(config) || flows.length === 0) return;
    const t = setInterval(() => {
      for (const flow of flows) {
        for (const d of flow.devices) {
          if (!d.entityId) continue;
          const arr = historyRef.current[d.entityId] || [];
          const base = 50 + (d.entityId.length * 17) % 400;
          const v = base + Math.sin(Date.now() / 5000 + d.entityId.length) * (base * 0.3) + Math.random() * 20;
          arr.push({ time: Date.now(), value: Math.max(0, v) });
          if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
          historyRef.current[d.entityId] = arr;
        }
      }
      recompute();
    }, 2000);
    return () => clearInterval(t);
  }, [config, flows, recompute]);

  return { dataMap, loading };
}
