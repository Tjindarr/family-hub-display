import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, loadConfig, saveConfig, isConfigured } from "@/lib/config";
import {
  createHAClient,
  generateMockTemperatureHistory,
  generateMockElectricityPrices,
  generateMockCalendarEvents,
} from "@/lib/ha-api";
import type { HACalendarEvent, ElectricityPrice } from "@/lib/config";

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(loadConfig);

  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  return { config, updateConfig, isConfigured: isConfigured(config) };
}

export interface TemperatureSeries {
  label: string;
  color: string;
  data: { time: string; value: number }[];
}

export function useTemperatureData(config: DashboardConfig) {
  const [series, setSeries] = useState<TemperatureSeries[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isConfigured(config)) {
      // Mock data
      setSeries(
        config.temperatureEntities.map((e) => ({
          label: e.label,
          color: e.color,
          data: generateMockTemperatureHistory(),
        }))
      );
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 3600000).toISOString();
      const results = await Promise.all(
        config.temperatureEntities.map(async (entity) => {
          const history = await client.getHistory(entity.entityId, start);
          const data = (history[0] || []).map((s) => ({
            time: new Date(s.last_changed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            value: parseFloat(s.state) || 0,
          }));
          return { label: entity.label, color: entity.color, data };
        })
      );
      setSeries(results);
    } catch (err) {
      console.error("Failed to fetch temperature data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetch, config.refreshInterval]);

  return { series, loading };
}

export function useCalendarData(config: DashboardConfig) {
  const [events, setEvents] = useState<HACalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!isConfigured(config)) {
      setEvents(generateMockCalendarEvents());
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 86400000);
      const allEvents: HACalendarEvent[] = [];
      for (const calId of config.calendarEntities) {
        const ev = await client.getCalendarEvents(calId, now.toISOString(), end.toISOString());
        allEvents.push(...ev);
      }
      allEvents.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || "";
        const bTime = b.start.dateTime || b.start.date || "";
        return aTime.localeCompare(bTime);
      });
      setEvents(allEvents);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents, config.refreshInterval]);

  return { events, loading };
}

export function useElectricityPrices(config: DashboardConfig) {
  const [prices, setPrices] = useState<ElectricityPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    if (!isConfigured(config)) {
      setPrices(generateMockElectricityPrices());
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const state = await client.getState(config.electricityPriceEntity);
      const forecast = state.attributes?.forecast || [];
      const current: ElectricityPrice = {
        time: "Now",
        price: parseFloat(state.state) || 0,
      };
      const forecastPrices = forecast.map((f: any) => ({
        time: new Date(f.start || f.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        price: f.price || f.value || 0,
      }));
      setPrices([current, ...forecastPrices]);
    } catch (err) {
      console.error("Failed to fetch electricity prices:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices, config.refreshInterval]);

  return { prices, loading };
}
