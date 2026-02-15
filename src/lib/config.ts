export interface WidgetLayout {
  colSpan: number; // 1-6
  row: number; // which row (1-based)
  rowSpan: number; // how many rows to span (1+)
}

export interface PhotoWidgetConfig {
  photos: string[]; // base64 data URLs or remote URLs
  intervalSeconds: number; // rotation interval
}

export interface CalendarEntityConfig {
  entityId: string;
  prefix: string; // prefix appended to event summaries
  color: string; // HSL color for event text
}

export interface WeatherConfig {
  entityId: string; // weather.* entity
  forecastDays: number; // number of days to forecast
  showPrecipitation: boolean;
  showSunrise: boolean;
  showSunset: boolean;
}

export interface DashboardConfig {
  haUrl: string;
  haToken: string;
  refreshInterval: number; // seconds
  calendarEntities: string[]; // legacy, kept for migration
  calendarEntityConfigs: CalendarEntityConfig[];
  temperatureEntities: TemperatureEntityConfig[];
  electricityPriceEntity: string;
  electricityForecastEntity: string;
  widgetLayouts: Record<string, WidgetLayout>;
  widgetOrder: string[]; // ordered widget IDs
  gridColumns: number; // number of grid columns (1-6)
  configBackendUrl: string; // URL to a simple REST API for persisting config
  photoWidget: PhotoWidgetConfig;
  personEntities: PersonEntityConfig[];
  weatherConfig: WeatherConfig;
}

export interface TemperatureEntityConfig {
  entityId: string;
  humidityEntityId?: string;
  label: string;
  color: string;
}

export interface PersonEntityConfig {
  name: string;
  entityPicture: string; // HA person entity ID (for picture)
  locationEntity: string; // sensor entity for zone/location name
  batteryEntity: string; // sensor entity for battery %
  batteryChargingEntity: string; // binary_sensor for charging state
  distanceEntity: string; // sensor entity for distance from home (km)
}

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HACalendarEvent {
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

export interface ElectricityPrice {
  time: string;
  price: number;
}

export interface NordpoolPricePoint {
  start: string;
  end: string;
  value: number;
}

const DEFAULT_CONFIG: DashboardConfig = {
  haUrl: "",
  haToken: "",
  refreshInterval: 30,
  calendarEntities: ["calendar.family"],
  calendarEntityConfigs: [
    { entityId: "calendar.family", prefix: "", color: "hsl(var(--foreground))" },
  ],
  temperatureEntities: [
    { entityId: "sensor.living_room_temperature", label: "Living Room", color: "hsl(174, 72%, 50%)" },
    { entityId: "sensor.bedroom_temperature", label: "Bedroom", color: "hsl(32, 95%, 55%)" },
    { entityId: "sensor.outside_temperature", label: "Outside", color: "hsl(258, 60%, 60%)" },
  ],
  electricityPriceEntity: "sensor.nordpool_kwh_se3_sek_3_10_025",
  electricityForecastEntity: "",
  widgetLayouts: {},
  widgetOrder: [],
  gridColumns: 4,
  configBackendUrl: "",
  photoWidget: { photos: [], intervalSeconds: 10 },
  personEntities: [],
  weatherConfig: {
    entityId: "weather.home",
    forecastDays: 5,
    showPrecipitation: true,
    showSunrise: true,
    showSunset: true,
  },
};

export function loadConfig(): DashboardConfig {
  try {
    const stored = localStorage.getItem("ha-dashboard-config");
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load config:", e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: DashboardConfig): void {
  localStorage.setItem("ha-dashboard-config", JSON.stringify(config));
}

/**
 * Load config from a remote REST backend (json-server, etc.)
 * Expects GET /config to return the config object.
 */
export async function loadRemoteConfig(backendUrl: string): Promise<DashboardConfig | null> {
  try {
    const url = backendUrl.replace(/\/$/, "");
    const res = await fetch(`${url}/config`);
    if (!res.ok) {
      // If 404, the record doesn't exist yet — that's fine
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return { ...DEFAULT_CONFIG, ...data };
  } catch (e) {
    console.error("Failed to load remote config:", e);
    return null;
  }
}

/**
 * Save config to a remote REST backend.
 * Uses PUT /config to upsert the config object.
 */
export async function saveRemoteConfig(backendUrl: string, config: DashboardConfig): Promise<boolean> {
  try {
    const url = backendUrl.replace(/\/$/, "");
    const res = await fetch(`${url}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save remote config:", e);
    return false;
  }
}

export function isConfigured(config: DashboardConfig): boolean {
  return config.haUrl.length > 0 && config.haToken.length > 0;
}
