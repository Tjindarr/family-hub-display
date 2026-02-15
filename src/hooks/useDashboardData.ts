import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, loadConfig, saveConfig, saveRemoteConfig, loadRemoteConfig, isConfigured } from "@/lib/config";
import type { CalendarEntityConfig } from "@/lib/config";
import {
  createHAClient,
  generateMockTemperatureHistory,
  generateMockElectricityPrices,
  generateMockCalendarEvents,
  generateMockWeatherData,
} from "@/lib/ha-api";
import type { HACalendarEvent, ElectricityPrice, NordpoolPricePoint } from "@/lib/config";
import type { PersonData } from "@/components/PersonWidget";
import type { WeatherData } from "@/components/WeatherWidget";

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(loadConfig);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  // On mount, if a backend URL is configured, load remote config
  useEffect(() => {
    const localConfig = loadConfig();
    if (localConfig.configBackendUrl && !remoteLoaded) {
      loadRemoteConfig(localConfig.configBackendUrl).then((remote) => {
        if (remote) {
          // Keep the backend URL from local (bootstrap)
          const merged = { ...remote, configBackendUrl: localConfig.configBackendUrl };
          setConfig(merged);
          saveConfig(merged); // cache locally too
        }
        setRemoteLoaded(true);
      });
    } else {
      setRemoteLoaded(true);
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      // Also save to remote if configured
      if (next.configBackendUrl) {
        saveRemoteConfig(next.configBackendUrl, next).catch(() => {
          console.warn("Failed to save to remote backend");
        });
      }
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
  const [events, setEvents] = useState<(HACalendarEvent & { _prefix?: string; _color?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    // Get calendar configs (migrate from legacy string[] if needed)
    const calConfigs: CalendarEntityConfig[] =
      config.calendarEntityConfigs && config.calendarEntityConfigs.length > 0
        ? config.calendarEntityConfigs
        : config.calendarEntities.map((id) => ({ entityId: id, prefix: "", color: "" }));

    if (!isConfigured(config)) {
      const mock = generateMockCalendarEvents();
      // Apply prefix/color from first config to mock events
      setEvents(mock.map((e) => ({ ...e, _prefix: calConfigs[0]?.prefix || "", _color: calConfigs[0]?.color || "" })));
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 86400000);
      const allEvents: (HACalendarEvent & { _prefix?: string; _color?: string })[] = [];
      for (const cal of calConfigs) {
        const ev = await client.getCalendarEvents(cal.entityId, now.toISOString(), end.toISOString());
        allEvents.push(...ev.map((e) => ({ ...e, _prefix: cal.prefix, _color: cal.color })));
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

export function useWeatherData(config: DashboardConfig) {
  const [weather, setWeather] = useState<WeatherData>({
    current: { temperature: 0, condition: "clear", humidity: 0, windSpeed: 0 },
    forecast: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    const wc = config.weatherConfig;
    if (!wc?.entityId) {
      setWeather(generateMockWeatherData(wc?.forecastDays || 5));
      setLoading(false);
      return;
    }

    if (!isConfigured(config)) {
      setWeather(generateMockWeatherData(wc.forecastDays));
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const state = await client.getState(wc.entityId);
      const attrs = state.attributes || {};

      const current = {
        temperature: attrs.temperature ?? parseFloat(state.state) ?? 0,
        condition: attrs.condition || state.state || "unknown",
        humidity: attrs.humidity || 0,
        windSpeed: attrs.wind_speed || 0,
        dewPoint: attrs.dew_point,
        cloudCoverage: attrs.cloud_coverage,
        uvIndex: attrs.uv_index,
        pressure: attrs.pressure,
        windBearing: attrs.wind_bearing,
        windGustSpeed: attrs.wind_gust_speed,
      };

      const rawForecast: any[] = attrs.forecast || [];
      const forecast = rawForecast.slice(0, wc.forecastDays).map((f: any) => ({
        date: f.datetime || f.date || "",
        tempHigh: f.temperature || f.tempHigh || 0,
        tempLow: f.templow ?? f.temp_low ?? f.tempLow ?? 0,
        condition: f.condition || "unknown",
        precipitation: f.precipitation ?? null, // met.no provides mm
        sunrise: f.sunrise || null,
        sunset: f.sunset || null,
      }));

      setWeather({ current, forecast });
    } catch (err) {
      console.error("Failed to fetch weather data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather, config.refreshInterval]);

  return { weather, loading };
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

export function usePersonData(config: DashboardConfig) {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!config.personEntities || config.personEntities.length === 0) {
      setPersons([]);
      setLoading(false);
      return;
    }

    if (!isConfigured(config)) {
      // Mock data
      setPersons(
        config.personEntities.map((p) => ({
          name: p.name || "Person",
          pictureUrl: null,
          location: "Home",
          batteryPercent: 40 + Math.random() * 55,
          isCharging: Math.random() > 0.5,
          distanceKm: Math.random() * 20,
        }))
      );
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const results = await Promise.all(
        config.personEntities.map(async (pe) => {
          let pictureUrl: string | null = null;
          let location: string | null = null;
          let batteryPercent: number | null = null;
          let isCharging = false;
          let distanceKm: number | null = null;

          // Picture from person entity
          if (pe.entityPicture) {
            try {
              const state = await client.getState(pe.entityPicture);
              const pic = state.attributes?.entity_picture;
              if (pic) {
                pictureUrl = pic.startsWith("http") ? pic : `${config.haUrl}${pic}`;
              }
            } catch { /* ignore */ }
          }

          // Location
          if (pe.locationEntity) {
            try {
              const state = await client.getState(pe.locationEntity);
              location = state.state || null;
            } catch { /* ignore */ }
          }

          // Battery
          if (pe.batteryEntity) {
            try {
              const state = await client.getState(pe.batteryEntity);
              batteryPercent = parseFloat(state.state) || null;
            } catch { /* ignore */ }
          }

          // Charging
          if (pe.batteryChargingEntity) {
            try {
              const state = await client.getState(pe.batteryChargingEntity);
              isCharging = state.state === "on";
            } catch { /* ignore */ }
          }

          // Distance
          if (pe.distanceEntity) {
            try {
              const state = await client.getState(pe.distanceEntity);
              distanceKm = parseFloat(state.state) || null;
            } catch { /* ignore */ }
          }

          return { name: pe.name, pictureUrl, location, batteryPercent, isCharging, distanceKm };
        })
      );
      setPersons(results);
    } catch (err) {
      console.error("Failed to fetch person data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { persons, loading };
}
