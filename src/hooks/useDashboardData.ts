import { useState, useEffect, useCallback } from "react";
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

  // On mount, load remote config (built-in API or external backend)
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

    try {
      const client = createHAClient(config);
      const now = new Date();
      const historyStart = new Date(now.getTime() - 24 * 3600000);
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
          let history: { time: string; value: number }[] | undefined;
          if (entity.showChart) {
            try {
              const raw = await client.getHistory(entity.entityId, historyStart.toISOString(), now.toISOString());
              if (raw?.[0]) {
                const points = raw[0];
                const step = Math.max(1, Math.floor(points.length / 60));
                history = points
                  .filter((_, i) => i % step === 0)
                  .map((s: any) => ({
                    time: s.last_updated,
                    value: parseFloat(s.state) || 0,
                  }))
                  .filter((p) => !isNaN(p.value));
              }
            } catch { /* ignore */ }
          }
          return {
            label: entity.label,
            color: entity.color,
            temperature: parseFloat(tempState.state) || null,
            humidity,
            entityId: entity.entityId,
            showChart: entity.showChart,
            chartType: entity.chartType,
            roundTemperature: entity.roundTemperature,
            history,
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

      // Fetch sunrise/sunset from sun.sun entity
      let sunriseStr: string | null = null;
      let sunsetStr: string | null = null;
      try {
        const sunState = await client.getState("sun.sun");
        const sunAttrs = sunState.attributes || {};
        if (sunAttrs.next_rising) {
          const d = new Date(sunAttrs.next_rising);
          sunriseStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        if (sunAttrs.next_setting) {
          const d = new Date(sunAttrs.next_setting);
          sunsetStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
      } catch { /* sun.sun not available */ }

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

      let rawForecast: any[] = [];
      try {
        rawForecast = await client.getWeatherForecast(wc.entityId, "daily");
      } catch {
        // ignore
      }
      if (!rawForecast || rawForecast.length === 0) {
        rawForecast = attrs.forecast || [];
      }

      const forecast = rawForecast.slice(0, wc.forecastDays).map((f: any, idx: number) => ({
        date: f.datetime || f.date || "",
        tempHigh: f.temperature || f.tempHigh || 0,
        tempLow: f.templow ?? f.temp_low ?? f.tempLow ?? 0,
        condition: f.condition || "unknown",
        precipitation: f.precipitation ?? f.precipitation_probability ?? null,
        // Only attach sunrise/sunset to today's entry (first forecast day)
        sunrise: idx === 0 ? (f.sunrise || sunriseStr) : (f.sunrise || null),
        sunset: idx === 0 ? (f.sunset || sunsetStr) : (f.sunset || null),
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
      const surcharge = config.electricitySurcharge ?? 0;
      setNordpool({
        today: mock.today.map((p) => ({ ...p, price: p.price + surcharge })),
        tomorrow: mock.tomorrow.map((p) => ({ ...p, price: p.price + surcharge })),
        currentPrice: mock.currentPrice + surcharge,
      });
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const state = await client.getState(config.electricityPriceEntity);
      const rawToday: NordpoolPricePoint[] = state.attributes?.raw_today || [];
      const rawTomorrow: NordpoolPricePoint[] = state.attributes?.raw_tomorrow || [];
      const currentPrice = parseFloat(state.state) || 0;

      const surcharge = config.electricitySurcharge ?? 0;

      const today = rawToday.map((p) => ({
        time: new Date(p.start),
        price: p.value + surcharge,
      }));

      const tomorrow = rawTomorrow.map((p) => ({
        time: new Date(p.start),
        price: p.value + surcharge,
      }));

      setNordpool({ today, tomorrow, currentPrice: currentPrice + surcharge });
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
    if (!isConfigured(config)) {
      // Always show mock person in demo mode
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

    if (!config.personEntities || config.personEntities.length === 0) {
      setPersons([]);
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);

      // Pre-fetch all zones once for icon matching by friendly_name
      let zoneEntities: HAState[] = [];
      try {
        const allStates = await client.getStates();
        zoneEntities = allStates.filter((s) => s.entity_id.startsWith("zone."));
      } catch { /* ignore */ }

      const results = await Promise.all(
        config.personEntities.map(async (pe) => {
          let pictureUrl: string | null = null;
          let location: string | null = null;
          let batteryPercent: number | null = null;
          let isCharging = false;
          let distanceKm: number | null = null;

          // Picture
          if (pe.entityPicture) {
            try {
              const state = await client.getState(pe.entityPicture);
              const pic = state.attributes?.entity_picture;
              if (pic) {
                pictureUrl = pic.startsWith("http") ? pic : `${config.haUrl}${pic}`;
              }
            } catch { /* ignore */ }
          }

          // Location + zone icon
          let zoneIcon: string | null = null;
          if (pe.locationEntity) {
            try {
              const state = await client.getState(pe.locationEntity);
              location = state.state || null;
              if (location && location !== "not_home" && location !== "unknown" && location !== "unavailable") {
                const matchedZone = zoneEntities.find(
                  (z) => (z.attributes?.friendly_name || "").toLowerCase() === location!.toLowerCase()
                );
                if (matchedZone) {
                  zoneIcon = matchedZone.attributes?.icon || null;
                }
              }
            } catch { /* ignore */ }
          }

          // Battery
          if (pe.batteryEntity) {
            try {
              const state = await client.getState(pe.batteryEntity);
              batteryPercent = parseFloat(state.state) || null;
            } catch { /* ignore */ }
          }

          // Charging — supports binary_sensor ("on") or text sensor ("Charging", "charging")
          if (pe.batteryChargingEntity) {
            try {
              const state = await client.getState(pe.batteryChargingEntity);
              const s = state.state.toLowerCase();
              isCharging = s === "on" || s === "charging";
            } catch { /* ignore */ }
          }

          // Distance — preserve 0 as valid
          if (pe.distanceEntity) {
            try {
              const state = await client.getState(pe.distanceEntity);
              const parsed = parseFloat(state.state);
              distanceKm = isNaN(parsed) ? null : parsed;
            } catch { /* ignore */ }
          }

          return { name: pe.name, pictureUrl, location, batteryPercent, isCharging, distanceKm, avatarSize: pe.avatarSize, zoneIcon };
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

    if (!fc?.calendarEntity) {
      setDays([]);
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const now = new Date();
      const end = new Date(now.getTime() + (fc.days || 5) * 86400000);
      const raw = await client.getCalendarEvents(fc.calendarEntity, now.toISOString(), end.toISOString());
      // Group all events by date
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
        .filter(([date]) => {
          if (!skipWk) return true;
          const day = new Date(date).getDay();
          return day !== 0 && day !== 6;
        })
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
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { menuDays: days, loading };
}
