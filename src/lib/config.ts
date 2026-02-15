export interface WidgetLayout {
  colSpan: number; // 1-6
  row: number; // which row (1-based)
  rowSpan: number; // how many rows to span (1+)
}

export interface PhotoWidgetConfig {
  photos: string[]; // base64 data URLs or remote URLs
  intervalSeconds: number; // rotation interval
  displayMode: "contain" | "cover" | "blur-fill"; // how to display photos
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

export interface CarConfig {
  chargerEntity: string; // sensor.ehg4chqg_status
  fuelRangeEntity: string; // sensor.ceed_fuel_driving_range
  batteryEntity: string; // sensor.ceed_ev_battery_level
}

export interface EnergyUsageConfig {
  monthlyCostEntity: string; // sensor.berget_monthly_cost
  monthlyConsumptionEntity: string; // sensor.berget_monthly_net_consumption
  currentPowerEntity: string; // sensor.tibber_pulse_berget_power
  maxPowerEntity: string; // sensor.tibber_pulse_berget_max_power
}

export interface FoodMenuConfig {
  calendarEntity: string; // calendar entity for food menu
  days: number; // number of days to show (default 5)
}

export type ThemeId = "midnight-teal" | "charcoal" | "deep-ocean" | "warm-ember" | "amoled-black";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "midnight-teal", label: "Midnight Teal" },
  { id: "charcoal", label: "Charcoal" },
  { id: "deep-ocean", label: "Deep Ocean" },
  { id: "warm-ember", label: "Warm Ember" },
  { id: "amoled-black", label: "AMOLED Black" },
];

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
  rowColumns: Record<number, number>; // per-row column overrides (row number -> columns)
  rowHeights: Record<number, number>; // per-row height in px (row number -> px)
  configBackendUrl: string; // URL to a simple REST API for persisting config
  photoWidget: PhotoWidgetConfig;
  personEntities: PersonEntityConfig[];
  weatherConfig: WeatherConfig;
  theme: ThemeId;
  carConfig: CarConfig;
  energyUsageConfig: EnergyUsageConfig;
  foodMenuConfig: FoodMenuConfig;
}

export interface TemperatureEntityConfig {
  entityId: string;
  humidityEntityId?: string;
  label: string;
  color: string;
}

export interface PersonEntityConfig {
  name: string;
  entityPicture: string;
  locationEntity: string;
  batteryEntity: string;
  batteryChargingEntity: string;
  distanceEntity: string;
  avatarSize?: number; // px, default 80
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
  rowColumns: {},
  rowHeights: {},
  gridColumns: 4,
  configBackendUrl: "",
  photoWidget: { photos: [], intervalSeconds: 10, displayMode: "contain" },
  personEntities: [],
  weatherConfig: {
    entityId: "weather.home",
    forecastDays: 5,
    showPrecipitation: true,
    showSunrise: true,
    showSunset: true,
  },
  theme: "midnight-teal",
  carConfig: {
    chargerEntity: "",
    fuelRangeEntity: "",
    batteryEntity: "",
  },
  energyUsageConfig: {
    monthlyCostEntity: "",
    monthlyConsumptionEntity: "",
    currentPowerEntity: "",
    maxPowerEntity: "",
  },
  foodMenuConfig: {
    calendarEntity: "",
    days: 5,
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
 * Load config from the built-in backend API or an external REST backend.
 * If backendUrl is provided, uses that; otherwise uses relative /api/config.
 */
export async function loadRemoteConfig(backendUrl?: string): Promise<DashboardConfig | null> {
  try {
    const url = backendUrl ? `${backendUrl.replace(/\/$/, "")}/config` : "/api/config";
    const res = await fetch(url);
    if (!res.ok) {
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
 * Save config to the built-in backend API or an external REST backend.
 */
export async function saveRemoteConfig(backendUrl: string | undefined, config: DashboardConfig): Promise<boolean> {
  try {
    const url = backendUrl ? `${backendUrl.replace(/\/$/, "")}/config` : "/api/config";
    const res = await fetch(url, {
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
