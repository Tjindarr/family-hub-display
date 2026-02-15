import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, loadConfig, saveConfig, isConfigured } from "@/lib/config";
import {
  createHAClient,
  generateMockTemperatureHistory,
  generateMockElectricityPrices,
  generateMockCalendarEvents,
} from "@/lib/ha-api";
import type { HACalendarEvent, ElectricityPrice, NordpoolPricePoint } from "@/lib/config";

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

export interface TemperatureSensorData {
  label: string;
  color: string;
  temperature: number | null;
  humidity: number | null;
  entityId: string;
}

export interface TemperatureSeries {
  label: string;
  color: string;
  data: { time: string; value: number }[];
}

export interface NordpoolData {
  today: { time: Date; price: number }[];
  tomorrow: { time: Date; price: number }[];
  currentPrice: number;
}

export function useTemperatureData(config: DashboardConfig) {
  const [sensors, setSensors] = useState<TemperatureSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isConfigured(config)) {
      // Mock data
      setSensors(
        config.temperatureEntities.map((e) => ({
          label: e.label,
          color: e.color,
          temperature: 18 + Math.random() * 8,
          humidity: e.humidityEntityId ? 40 + Math.random() * 30 : null,
          entityId: e.entityId,
        }))
      );
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const results = await Promise.all(
        config.temperatureEntities.map(async (entity) => {
          const tempState = await client.getState(entity.entityId);
          let humidity: number | null = null;
          if (entity.humidityEntityId) {
            try {
              const humState = await client.getState(entity.humidityEntityId);
              humidity = parseFloat(humState.state) || null;
            } catch { /* ignore */ }
          }
          return {
            label: entity.label,
            color: entity.color,
            temperature: parseFloat(tempState.state) || null,
            humidity,
            entityId: entity.entityId,
          };
        })
      );
      setSensors(results);
    } catch (err) {
      console.error("Failed to fetch temperature data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { sensors, loading };
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
  const [nordpool, setNordpool] = useState<NordpoolData>({ today: [], tomorrow: [], currentPrice: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    if (!isConfigured(config)) {
      const mock = generateMockElectricityPrices();
      setNordpool(mock);
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const state = await client.getState(config.electricityPriceEntity);
      const rawToday: NordpoolPricePoint[] = state.attributes?.raw_today || [];
      const rawTomorrow: NordpoolPricePoint[] = state.attributes?.raw_tomorrow || [];
      const currentPrice = parseFloat(state.state) || 0;

      const today = rawToday.map((p) => ({
        time: new Date(p.start),
        price: p.value,
      }));

      const tomorrow = rawTomorrow.map((p) => ({
        time: new Date(p.start),
        price: p.value,
      }));

      setNordpool({ today, tomorrow, currentPrice });
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

  return { nordpool, loading };
}
