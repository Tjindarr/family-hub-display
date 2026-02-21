import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardConfig, loadConfig, saveConfig, saveRemoteConfig, loadRemoteConfig, isConfigured, type HAState } from "@/lib/config";
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

  useEffect(() => {
    if (!remoteLoaded) {
      loadRemoteConfig().then((remote) => {
        if (remote) {
          setConfig(remote);
          saveConfig(remote);
        }
        setRemoteLoaded(true);
      });
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      saveRemoteConfig(undefined, next).catch(() => {
        console.warn("Failed to save to remote backend");
      });
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
  showChart?: boolean;
  chartType?: string;
  roundTemperature?: boolean;
  history?: { time: string; value: number }[];
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

export type GetCachedState = (entityId: string) => HAState | undefined;
export type GetAllStates = () => HAState[];
export type OnStateChange = (callback: (entityId: string, state: HAState) => void) => () => void;

/** Collect all entity IDs a hook cares about so we can filter WS events */
function collectTempEntityIds(config: DashboardConfig): Set<string> {
  const ids = new Set<string>();
  for (const e of config.temperatureEntities) {
    ids.add(e.entityId);
    if (e.humidityEntityId) ids.add(e.humidityEntityId);
  }
  return ids;
}

// ── Temperature ─────────────────────────────────────────────────

export function useTemperatureData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [sensors, setSensors] = useState<TemperatureSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const historyRef = useRef<Record<string, { time: string; value: number }[]>>({});

  // Build current sensor values from cache (no API calls)
  const updateCurrentValues = useCallback(() => {
    if (!isConfigured(config) || !getCachedState) return;

    setSensors((prev) => {
      return config.temperatureEntities.map((entity, i) => {
        const tempState = getCachedState(entity.entityId);
        let humidity: number | null = null;
        if (entity.humidityEntityId) {
          const humState = getCachedState(entity.humidityEntityId);
          if (humState) humidity = parseFloat(humState.state) || null;
        }
        return {
          label: entity.label,
          color: entity.color,
          temperature: tempState ? (isNaN(parseFloat(tempState.state)) ? null : parseFloat(tempState.state)) : (prev[i]?.temperature ?? null),
          humidity: humidity ?? prev[i]?.humidity ?? null,
          entityId: entity.entityId,
          showChart: entity.showChart,
          chartType: entity.chartType,
          roundTemperature: entity.roundTemperature,
          history: historyRef.current[entity.entityId] || prev[i]?.history,
        };
      });
    });
    setLoading(false);
  }, [config, getCachedState]);

  // Fetch history data via REST (runs on longer interval)
  const fetchHistory = useCallback(async () => {
    if (!isConfigured(config)) return;

    const client = createHAClient(config);
    const now = new Date();
    const historyStart = new Date(now.getTime() - 24 * 3600000);

    for (const entity of config.temperatureEntities) {
      if (!entity.showChart) continue;
      try {
        const raw = await client.getHistory(entity.entityId, historyStart.toISOString(), now.toISOString());
        if (raw?.[0]) {
          const numericPoints = raw[0].filter((s: any) => {
            const v = parseFloat(s.state);
            return !isNaN(v) && isFinite(v);
          });
          const step = Math.max(1, Math.floor(numericPoints.length / 60));
          historyRef.current[entity.entityId] = numericPoints
            .filter((_: any, i: number) => i % step === 0)
            .map((s: any) => ({
              time: s.last_updated,
              value: parseFloat(s.state),
            }));
        }
      } catch { /* ignore */ }
    }

    // Trigger re-render with updated history
    updateCurrentValues();
  }, [config, updateCurrentValues]);

  // Full initial fetch (mock or real)
  const fetchData = useCallback(async () => {
    if (!isConfigured(config)) {
      setSensors(
        config.temperatureEntities.map((e) => ({
          label: e.label,
          color: e.color,
          temperature: 18 + Math.random() * 8,
          humidity: e.humidityEntityId ? 40 + Math.random() * 30 : null,
          entityId: e.entityId,
          showChart: e.showChart,
          chartType: e.chartType,
          roundTemperature: e.roundTemperature,
          history: e.showChart
            ? Array.from({ length: 48 }, (_, i) => {
                const d = new Date(Date.now() - (47 - i) * 30 * 60000);
                return { time: d.toISOString(), value: 18 + Math.random() * 8 };
              })
            : undefined,
        }))
      );
      setLoading(false);
      return;
    }

    // Initial load: get values + history
    updateCurrentValues();
    await fetchHistory();
  }, [config, updateCurrentValues, fetchHistory]);

  // Subscribe to WS state changes for instant updates
  useEffect(() => {
    if (!onStateChange || !isConfigured(config)) return;
    const entityIds = collectTempEntityIds(config);
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityIds.has(entityId)) {
        updateCurrentValues();
      }
    });
    return unsubscribe;
  }, [onStateChange, config, updateCurrentValues]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // History refresh on longer interval (5 min)
  useEffect(() => {
    if (!isConfigured(config)) return;
    const hasCharts = config.temperatureEntities.some((e) => e.showChart);
    if (!hasCharts) return;
    const interval = setInterval(fetchHistory, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchHistory, config]);

  return { sensors, loading };
}

// ── Calendar (REST only — no WS equivalent) ─────────────────────

export function useCalendarData(config: DashboardConfig) {
  const [events, setEvents] = useState<(HACalendarEvent & { _prefix?: string; _color?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    const calConfigs: CalendarEntityConfig[] =
      config.calendarEntityConfigs && config.calendarEntityConfigs.length > 0
        ? config.calendarEntityConfigs
        : config.calendarEntities.map((id) => ({ entityId: id, prefix: "", color: "" }));

    if (!isConfigured(config)) {
      const mock = generateMockCalendarEvents();
      setEvents(mock.map((e) => ({ ...e, _prefix: calConfigs[0]?.prefix || "", _color: calConfigs[0]?.color || "" })));
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const globalDays = config.calendarForecastDays || 7;
      const allEvents: (HACalendarEvent & { _prefix?: string; _color?: string })[] = [];
      for (const cal of calConfigs) {
        const days = cal.forecastDays || globalDays;
        const end = new Date(now.getTime() + days * 86400000);
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
    const interval = setInterval(fetchEvents, Math.max(config.refreshInterval, 60) * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents, config.refreshInterval]);

  return { events, loading };
}

// ── Weather (current state via WS, forecast via REST) ───────────

export function useWeatherData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [weather, setWeather] = useState<WeatherData>({
    current: { temperature: 0, condition: "clear", humidity: 0, windSpeed: 0 },
    forecast: [],
  });
  const [loading, setLoading] = useState(true);
  const forecastRef = useRef<any[]>([]);

  const updateCurrentFromCache = useCallback(() => {
    const wc = config.weatherConfig;
    if (!wc?.entityId || !getCachedState || !isConfigured(config)) return;

    const state = getCachedState(wc.entityId);
    if (!state) return;
    const attrs = state.attributes || {};

    let sunriseStr: string | null = null;
    let sunsetStr: string | null = null;
    const sunState = getCachedState("sun.sun");
    if (sunState) {
      const sunAttrs = sunState.attributes || {};
      if (sunAttrs.next_rising) sunriseStr = new Date(sunAttrs.next_rising).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (sunAttrs.next_setting) sunsetStr = new Date(sunAttrs.next_setting).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

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

    const forecast = (forecastRef.current.length > 0 ? forecastRef.current : (attrs.forecast || [])).slice(0, wc.forecastDays).map((f: any, idx: number) => ({
      date: f.datetime || f.date || "",
      tempHigh: f.temperature || f.tempHigh || 0,
      tempLow: f.templow ?? f.temp_low ?? f.tempLow ?? 0,
      condition: f.condition || "unknown",
      precipitation: f.precipitation ?? f.precipitation_probability ?? null,
      sunrise: idx === 0 ? (f.sunrise || sunriseStr) : (f.sunrise || null),
      sunset: idx === 0 ? (f.sunset || sunsetStr) : (f.sunset || null),
    }));

    setWeather({ current, forecast });
    setLoading(false);
  }, [config, getCachedState]);

  // Fetch forecast via REST service call
  const fetchForecast = useCallback(async () => {
    const wc = config.weatherConfig;
    if (!wc?.entityId || !isConfigured(config)) return;

    try {
      const client = createHAClient(config);
      const rawForecast = await client.getWeatherForecast(wc.entityId, "daily");
      if (rawForecast && rawForecast.length > 0) {
        forecastRef.current = rawForecast;
      }
      updateCurrentFromCache();
    } catch {
      // ignore
    }
  }, [config, updateCurrentFromCache]);

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

    updateCurrentFromCache();
    await fetchForecast();
  }, [config, updateCurrentFromCache, fetchForecast]);

  // WS listener for weather/sun entity changes
  useEffect(() => {
    if (!onStateChange || !isConfigured(config)) return;
    const wc = config.weatherConfig;
    const watchIds = new Set<string>();
    if (wc?.entityId) watchIds.add(wc.entityId);
    watchIds.add("sun.sun");

    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || watchIds.has(entityId)) updateCurrentFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateCurrentFromCache]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  // Forecast refresh every 30 min
  useEffect(() => {
    if (!isConfigured(config) || !config.weatherConfig?.entityId) return;
    const interval = setInterval(fetchForecast, 1800000);
    return () => clearInterval(interval);
  }, [fetchForecast, config]);

  return { weather, loading };
}

// ── Electricity (state via WS — attributes have price arrays) ───

export function useElectricityPrices(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [nordpool, setNordpool] = useState<NordpoolData>({ today: [], tomorrow: [], currentPrice: 0 });
  const [loading, setLoading] = useState(true);

  const updateFromCache = useCallback(() => {
    if (!isConfigured(config) || !getCachedState) return;
    const state = getCachedState(config.electricityPriceEntity);
    if (!state) return;
    processElectricityState(state);
    setLoading(false);

    function processElectricityState(state: HAState) {
      const rawToday: NordpoolPricePoint[] = state.attributes?.raw_today || [];
      const rawTomorrow: NordpoolPricePoint[] = state.attributes?.raw_tomorrow || [];
      const currentPrice = parseFloat(state.state) || 0;
      const surcharge = config.electricitySurcharge ?? 0;
      setNordpool({
        today: rawToday.map((p) => ({ time: new Date(p.start), price: p.value + surcharge })),
        tomorrow: rawTomorrow.map((p) => ({ time: new Date(p.start), price: p.value + surcharge })),
        currentPrice: currentPrice + surcharge,
      });
    }
  }, [config, getCachedState]);

  const fetchPrices = useCallback(async () => {
    if (!isConfigured(config)) {
      const mock = generateMockElectricityPrices();
      const surcharge = config.electricitySurcharge ?? 0;
      setNordpool({
        today: mock.today.map((p) => ({ ...p, price: p.price + surcharge })),
        tomorrow: mock.tomorrow.map((p) => ({ ...p, price: p.price + surcharge })),
        currentPrice: mock.currentPrice + surcharge,
      });
      setLoading(false);
      return;
    }
    updateFromCache();

    // Fallback if cache is empty
    if (!getCachedState?.(config.electricityPriceEntity)) {
      try {
        const client = createHAClient(config);
        const state = await client.getState(config.electricityPriceEntity);
        const surcharge = config.electricitySurcharge ?? 0;
        const rawToday: NordpoolPricePoint[] = state.attributes?.raw_today || [];
        const rawTomorrow: NordpoolPricePoint[] = state.attributes?.raw_tomorrow || [];
        const currentPrice = parseFloat(state.state) || 0;
        setNordpool({
          today: rawToday.map((p) => ({ time: new Date(p.start), price: p.value + surcharge })),
          tomorrow: rawTomorrow.map((p) => ({ time: new Date(p.start), price: p.value + surcharge })),
          currentPrice: currentPrice + surcharge,
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch electricity prices:", err);
        setLoading(false);
      }
    }
  }, [config, getCachedState, updateFromCache]);

  // WS listener
  useEffect(() => {
    if (!onStateChange || !isConfigured(config)) return;
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityId === config.electricityPriceEntity) updateFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  return { nordpool, loading };
}

// ── Person (all state via WS) ───────────────────────────────────

export function usePersonData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange,
  getAllStates?: GetAllStates
) {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  const updateFromCache = useCallback(() => {
    if (!isConfigured(config) || !getCachedState) return;
    if (!config.personEntities || config.personEntities.length === 0) {
      setPersons([]);
      setLoading(false);
      return;
    }

    // Get zone entities for icon matching
    const zoneEntities = getAllStates
      ? getAllStates().filter((s) => s.entity_id.startsWith("zone."))
      : [];

    const results = config.personEntities.map((pe) => {
      let pictureUrl: string | null = null;
      let location: string | null = null;
      let batteryPercent: number | null = null;
      let isCharging = false;
      let distanceKm: number | null = null;
      let zoneIcon: string | null = null;

      if (pe.entityPicture) {
        const state = getCachedState(pe.entityPicture);
        if (state) {
          const pic = state.attributes?.entity_picture;
          if (pic) pictureUrl = pic.startsWith("http") ? pic : `${config.haUrl}${pic}`;
        }
      }

      if (pe.locationEntity) {
        const state = getCachedState(pe.locationEntity);
        if (state) {
          location = state.state || null;
          if (location && location !== "not_home" && location !== "unknown" && location !== "unavailable") {
            const matchedZone = zoneEntities.find(
              (z) => (z.attributes?.friendly_name || "").toLowerCase() === location!.toLowerCase()
            );
            if (matchedZone) zoneIcon = matchedZone.attributes?.icon || null;
          }
        }
      }

      if (pe.batteryEntity) {
        const state = getCachedState(pe.batteryEntity);
        if (state) batteryPercent = parseFloat(state.state) || null;
      }

      if (pe.batteryChargingEntity) {
        const state = getCachedState(pe.batteryChargingEntity);
        if (state) {
          const s = state.state.toLowerCase();
          isCharging = s === "on" || s === "charging";
        }
      }

      if (pe.distanceEntity) {
        const state = getCachedState(pe.distanceEntity);
        if (state) {
          const parsed = parseFloat(state.state);
          distanceKm = isNaN(parsed) ? null : parsed;
        }
      }

      return { name: pe.name, pictureUrl, location, batteryPercent, isCharging, distanceKm, avatarSize: pe.avatarSize, zoneIcon };
    });

    setPersons(results);
    setLoading(false);
  }, [config, getCachedState, getAllStates]);

  const fetchData = useCallback(async () => {
    if (!isConfigured(config)) {
      const mockPersons = config.personEntities && config.personEntities.length > 0
        ? config.personEntities.map((p) => ({
            name: p.name || "Person",
            pictureUrl: null,
            location: "Home",
            batteryPercent: 40 + Math.random() * 55,
            isCharging: Math.random() > 0.5,
            distanceKm: Math.random() * 20,
            avatarSize: p.avatarSize,
          }))
        : [{
            name: "Demo User",
            pictureUrl: null,
            location: "Home",
            batteryPercent: 72,
            isCharging: true,
            distanceKm: 3.2,
            avatarSize: undefined,
          }];
      setPersons(mockPersons);
      setLoading(false);
      return;
    }

    updateFromCache();
  }, [config, updateFromCache]);

  // WS listener for person-related entities
  useEffect(() => {
    if (!onStateChange || !isConfigured(config)) return;
    const entityIds = new Set<string>();
    for (const pe of (config.personEntities || [])) {
      if (pe.entityPicture) entityIds.add(pe.entityPicture);
      if (pe.locationEntity) entityIds.add(pe.locationEntity);
      if (pe.batteryEntity) entityIds.add(pe.batteryEntity);
      if (pe.batteryChargingEntity) entityIds.add(pe.batteryChargingEntity);
      if (pe.distanceEntity) entityIds.add(pe.distanceEntity);
    }
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityIds.has(entityId)) updateFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { persons, loading };
}

// ── Food Menu (REST only) ───────────────────────────────────────

export function useFoodMenuData(config: DashboardConfig) {
  const [days, setDays] = useState<{ date: string; meals: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const fc = config.foodMenuConfig;

    if (!isConfigured(config)) {
      const now = new Date();
      const numDays = fc?.days || 5;
      const allMeals = [
        ["Pasta Bolognese", "Caesar Salad"],
        ["Chicken Stir Fry"],
        ["Fish Tacos", "Grilled Veggies"],
        ["Veggie Curry", "Naan Bread", "Raita"],
        ["Meatballs & Mash"],
        ["Salmon & Rice"],
        ["Pizza Night", "Garlic Bread"],
      ];
      const skipWk = fc?.skipWeekends ?? false;
      const mock: { date: string; meals: string[] }[] = [];
      let offset = 0;
      while (mock.length < numDays) {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        offset++;
        if (skipWk && (d.getDay() === 0 || d.getDay() === 6)) continue;
        mock.push({ date: d.toISOString().split("T")[0], meals: allMeals[mock.length % allMeals.length] });
      }
      setDays(mock);
      setLoading(false);
      return;
    }

    const source = fc?.source || "calendar";

    if (source === "skolmaten") {
      if (!fc?.skolmatenEntity) { setDays([]); setLoading(false); return; }
      try {
        const client = createHAClient(config);
        const state = await client.getState(fc.skolmatenEntity);
        const calendar = state?.attributes?.calendar;
        if (!calendar || typeof calendar !== "object") { setDays([]); setLoading(false); return; }
        const today = new Date().toISOString().split("T")[0];
        const skipWk = fc.skipWeekends ?? false;
        const numDays = fc.days || 5;
        const result: { date: string; meals: string[] }[] = [];
        const sortedDates = Object.keys(calendar).sort();
        for (const dateStr of sortedDates) {
          if (dateStr < today) continue;
          if (result.length >= numDays) break;
          if (skipWk) { const day = new Date(dateStr).getDay(); if (day === 0 || day === 6) continue; }
          const entries = calendar[dateStr];
          const meals = Array.isArray(entries) ? entries.map((e: any) => e.dish || e.summary || "").filter(Boolean) : [];
          if (meals.length > 0) result.push({ date: dateStr, meals });
        }
        setDays(result);
      } catch (err) {
        console.error("Failed to fetch skolmaten data:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!fc?.calendarEntity) { setDays([]); setLoading(false); return; }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const end = new Date(now.getTime() + (fc.days || 5) * 86400000);
      const raw = await client.getCalendarEvents(fc.calendarEntity, now.toISOString(), end.toISOString());
      const byDate = new Map<string, string[]>();
      for (const ev of raw) {
        const dt = ev.start.date || (ev.start.dateTime ? ev.start.dateTime.split("T")[0] : "");
        if (dt) {
          if (!byDate.has(dt)) byDate.set(dt, []);
          byDate.get(dt)!.push(ev.summary);
        }
      }
      const skipWk = fc.skipWeekends ?? false;
      const sorted = [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .filter(([date]) => { if (!skipWk) return true; const day = new Date(date).getDay(); return day !== 0 && day !== 6; })
        .map(([date, meals]) => ({ date, meals }));
      setDays(sorted);
    } catch (err) {
      console.error("Failed to fetch food menu:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, Math.max(config.refreshInterval, 60) * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { menuDays: days, loading };
}
