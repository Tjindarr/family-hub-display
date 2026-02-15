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
import type { CarChargerData } from "@/components/CarChargerWidget";
import type { CarFuelData } from "@/components/CarFuelWidget";
import type { CarBatteryData } from "@/components/CarBatteryWidget";
import type { MonthlyEnergyData } from "@/components/MonthlyEnergyWidget";
import type { PowerUsageData } from "@/components/PowerUsageWidget";

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
          avatarSize: p.avatarSize,
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

          return { name: pe.name, pictureUrl, location, batteryPercent, isCharging, distanceKm, avatarSize: pe.avatarSize };
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

export function useCarData(config: DashboardConfig) {
  const [charger, setCharger] = useState<CarChargerData>({ status: "disconnected", entityId: "" });
  const [fuel, setFuel] = useState<CarFuelData>({ rangeKm: null, entityId: "" });
  const [battery, setBattery] = useState<CarBatteryData>({ percent: null, entityId: "" });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const cc = config.carConfig;
    if (!cc?.chargerEntity && !cc?.fuelRangeEntity && !cc?.batteryEntity) {
      setLoading(false);
      return;
    }

    if (!isConfigured(config)) {
      setCharger({ status: "ready_to_charge", entityId: cc?.chargerEntity || "" });
      setFuel({ rangeKm: 245, entityId: cc?.fuelRangeEntity || "" });
      setBattery({ percent: 62, entityId: cc?.batteryEntity || "" });
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      if (cc.chargerEntity) {
        try {
          const s = await client.getState(cc.chargerEntity);
          setCharger({ status: s.state, entityId: cc.chargerEntity });
        } catch { /* ignore */ }
      }
      if (cc.fuelRangeEntity) {
        try {
          const s = await client.getState(cc.fuelRangeEntity);
          setFuel({ rangeKm: parseFloat(s.state) || 0, entityId: cc.fuelRangeEntity });
        } catch { /* ignore */ }
      }
      if (cc.batteryEntity) {
        try {
          const s = await client.getState(cc.batteryEntity);
          setBattery({ percent: parseFloat(s.state) || 0, entityId: cc.batteryEntity });
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to fetch car data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { charger, fuel, battery, loading };
}

export function useEnergyUsageData(config: DashboardConfig) {
  const [monthly, setMonthly] = useState<MonthlyEnergyData>({ monthlyCost: null, monthlyKwh: null, costHistory: [] });
  const [power, setPower] = useState<PowerUsageData>({ currentWatt: null, maxWatt: null, powerHistory: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const ec = config.energyUsageConfig;
    if (!ec?.monthlyCostEntity && !ec?.currentPowerEntity) {
      setLoading(false);
      return;
    }

    if (!isConfigured(config)) {
      // Mock data
      const mockHistory = Array.from({ length: 12 }, (_, i) => ({
        time: `Day ${i * 2 + 1}`,
        cost: 200 + Math.random() * 800,
        kwh: 50 + Math.random() * 200,
      }));
      setMonthly({ monthlyCost: 547, monthlyKwh: 182, costHistory: mockHistory });
      const mockPower = Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, "0")}:00`,
        watt: 200 + Math.random() * 2000,
      }));
      setPower({ currentWatt: 1240, maxWatt: 3800, powerHistory: mockPower });
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      let monthlyCost: number | null = null;
      let monthlyKwh: number | null = null;
      let currentWatt: number | null = null;
      let maxWatt: number | null = null;

      if (ec.monthlyCostEntity) {
        try {
          const s = await client.getState(ec.monthlyCostEntity);
          monthlyCost = parseFloat(s.state) || 0;
        } catch { /* ignore */ }
      }
      if (ec.monthlyConsumptionEntity) {
        try {
          const s = await client.getState(ec.monthlyConsumptionEntity);
          monthlyKwh = parseFloat(s.state) || 0;
        } catch { /* ignore */ }
      }
      if (ec.currentPowerEntity) {
        try {
          const s = await client.getState(ec.currentPowerEntity);
          currentWatt = parseFloat(s.state) || 0;
        } catch { /* ignore */ }
      }
      if (ec.maxPowerEntity) {
        try {
          const s = await client.getState(ec.maxPowerEntity);
          maxWatt = parseFloat(s.state) || 0;
        } catch { /* ignore */ }
      }

      // Try to get history for charts
      let costHistory: { time: string; cost: number; kwh: number }[] = [];
      let powerHistory: { time: string; watt: number }[] = [];

      // Fetch monthly cost/consumption history (last 30 days, daily samples)
      if (ec.monthlyCostEntity) {
        try {
          const now = new Date();
          const start = new Date(now.getTime() - 30 * 24 * 3600000);
          const costHistoryRaw = await client.getHistory(ec.monthlyCostEntity, start.toISOString(), now.toISOString());
          let kwhHistoryRaw: any[] | null = null;
          if (ec.monthlyConsumptionEntity) {
            try {
              kwhHistoryRaw = await client.getHistory(ec.monthlyConsumptionEntity, start.toISOString(), now.toISOString());
            } catch { /* ignore */ }
          }
          if (costHistoryRaw?.[0]) {
            const costPoints = costHistoryRaw[0];
            const kwhPoints = kwhHistoryRaw?.[0] || [];
            // Sample ~12 points across the data
            const step = Math.max(1, Math.floor(costPoints.length / 12));
            costHistory = costPoints
              .filter((_, i) => i % step === 0)
              .map((s, i) => {
                const matchingKwh = kwhPoints[Math.min(i * step, kwhPoints.length - 1)];
                return {
                  time: new Date(s.last_updated).toLocaleDateString([], { day: "2-digit", month: "short" }),
                  cost: parseFloat(s.state) || 0,
                  kwh: matchingKwh ? parseFloat(matchingKwh.state) || 0 : 0,
                };
              });
          }
        } catch { /* ignore */ }
      }

      // Fetch power history (last 24 hours)
      if (ec.currentPowerEntity) {
        try {
          const now = new Date();
          const start = new Date(now.getTime() - 24 * 3600000);
          const history = await client.getHistory(ec.currentPowerEntity, start.toISOString(), now.toISOString());
          if (history?.[0]) {
            powerHistory = history[0]
              .filter((_, i) => i % 4 === 0)
              .map((s) => ({
                time: new Date(s.last_updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
                watt: parseFloat(s.state) || 0,
              }));
          }
        } catch { /* ignore */ }
      }

      setMonthly({ monthlyCost, monthlyKwh, costHistory });
      setPower({ currentWatt, maxWatt, powerHistory });
    } catch (err) {
      console.error("Failed to fetch energy data:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { monthly, power, loading };
}
