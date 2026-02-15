export interface WidgetLayout {
  colSpan: number; // 1-4
}

export interface DashboardConfig {
  haUrl: string;
  haToken: string;
  refreshInterval: number; // seconds
  calendarEntities: string[];
  temperatureEntities: TemperatureEntityConfig[];
  electricityPriceEntity: string;
  electricityForecastEntity: string;
  widgetLayouts: Record<string, WidgetLayout>;
}

export interface TemperatureEntityConfig {
  entityId: string;
  humidityEntityId?: string;
  label: string;
  color: string;
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
  temperatureEntities: [
    { entityId: "sensor.living_room_temperature", label: "Living Room", color: "hsl(174, 72%, 50%)" },
    { entityId: "sensor.bedroom_temperature", label: "Bedroom", color: "hsl(32, 95%, 55%)" },
    { entityId: "sensor.outside_temperature", label: "Outside", color: "hsl(258, 60%, 60%)" },
  ],
  electricityPriceEntity: "sensor.nordpool_kwh_se3_sek_3_10_025",
  electricityForecastEntity: "",
  widgetLayouts: {},
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

export function isConfigured(config: DashboardConfig): boolean {
  return config.haUrl.length > 0 && config.haToken.length > 0;
}
