export interface WidgetFontSizes {
  heading?: number; // section headers (px)
  value?: number;   // main data values (px)
  body?: number;    // body/readable text (px)
  label?: number;   // small labels/units (px)
}

export interface GlobalFontSizes {
  heading: number; // default 12
  value: number;   // default 18
  body: number;    // default 14
  label: number;   // default 10
}

export interface WidgetLayout {
  colSpan: number; // 1-6
  row: number; // which row (1-based)
  rowSpan: number; // how many rows to span (1+)
  widgetGroup?: string; // optional group ID — widgets with same group stack in one card
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

export interface CalendarDisplayConfig {
  showEventBody: boolean;
  showEndDate: boolean;
  hideAllDayText: boolean;
  showWeekNumber: boolean;
  fontSizeDay: number;    // px
  fontSizeTime: number;   // px
  fontSizeTitle: number;  // px
  fontSizeBody: number;   // px
}

export interface WeatherConfig {
  entityId: string; // weather.* entity
  forecastDays: number; // number of days to forecast
  showPrecipitation: boolean;
  showSunrise: boolean;
  showSunset: boolean;
}

export interface FoodMenuConfig {
  calendarEntity: string; // calendar entity for food menu
  days: number; // number of days to show (default 5)
  skipWeekends: boolean; // skip Saturday and Sunday when counting days forward
}

export interface RssNewsConfig {
  id: string;
  label: string;
  feedUrl: string;
  maxItems: number; // max items to display (default 15)
}

export type SensorChartType = "line" | "bar" | "area" | "step" | "scatter";
export type ChartGrouping = "minute" | "hour" | "day";
export type ChartAggregation = "average" | "max" | "min" | "sum" | "last" | "delta";

export interface SensorInfoItem {
  entityId: string;
  label: string;
  unit: string;
  color: string;
}

export interface SensorChartSeries {
  entityId: string;
  label: string;
  color: string;
  chartType: SensorChartType;
}

export interface GeneralSensorConfig {
  id: string; // unique ID for this sensor card
  label: string;
  showLabel: boolean;
  icon: string; // lucide icon name (kebab-case)
  iconSize?: number; // icon size in px (default 20)
  showGraph: boolean;
  historyHours: number; // 1, 6, 24, 168 (7d)
  chartGrouping: ChartGrouping; // aggregate data by minute, hour or day
  chartAggregation?: ChartAggregation; // how to combine values in each bucket (default: average)
  chartSeries: SensorChartSeries[]; // sensors to plot on the graph
  topInfo: SensorInfoItem[]; // up to 4 sensors displayed at the top
  bottomInfo: SensorInfoItem[]; // up to 4 sensors displayed at the bottom
  fontSize?: WidgetFontSizes; // per-widget font size overrides
}

export interface SensorGridCellInterval {
  min: number;
  max: number;
  icon: string;
  color: string;
}

export interface SensorGridValueMap {
  from: string; // raw value from sensor
  to: string;   // displayed value
}

export interface SensorGridCellConfig {
  entityId: string;
  label: string;
  icon: string; // lucide icon name (kebab-case)
  unit: string;
  color: string; // icon color
  valueColor?: string; // separate value text color (falls back to color)
  iconSize?: number; // icon size in px (default 16)
  fontSize?: number; // value font size in px
  labelFontSize?: number; // label font size in px
  useIntervals?: boolean; // enable conditional icon/color based on value
  intervals?: SensorGridCellInterval[]; // exactly 4 intervals
  valueMaps?: SensorGridValueMap[]; // value rewrite rules
}

export interface SensorGridConfig {
  id: string;
  label: string;
  rows: number; // 1-6
  columns: number; // 1-6
  cells: SensorGridCellConfig[]; // row-major order, length = rows * columns
}

export type ThemeId = "midnight-teal" | "charcoal" | "deep-ocean" | "warm-ember" | "amoled-black" | "macos-dark";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "midnight-teal", label: "Midnight Teal" },
  { id: "charcoal", label: "Charcoal" },
  { id: "deep-ocean", label: "Deep Ocean" },
  { id: "warm-ember", label: "Warm Ember" },
  { id: "amoled-black", label: "AMOLED Black" },
  { id: "macos-dark", label: "macOS Dark" },
];

export interface DashboardConfig {
  haUrl: string;
  haToken: string;
  refreshInterval: number; // seconds
  calendarEntities: string[]; // legacy, kept for migration
  calendarEntityConfigs: CalendarEntityConfig[];
  calendarDayColor: string; // color for day labels (e.g. "Today", "Tomorrow")
  calendarTimeColor: string; // color for time labels (e.g. "14:00")
  calendarDisplay: CalendarDisplayConfig;
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
  foodMenuConfig: FoodMenuConfig;
  generalSensors: GeneralSensorConfig[];
  sensorGrids: SensorGridConfig[];
  rssFeeds: RssNewsConfig[];
  globalFontSizes: GlobalFontSizes;
  widgetFontSizes: Record<string, WidgetFontSizes>;
  personCardFontSizes: PersonCardFontSizes;
}

export interface TemperatureEntityConfig {
  entityId: string;
  humidityEntityId?: string;
  label: string;
  color: string;
  group?: number; // sensors with the same group number render in one widget
  showChart?: boolean; // show a background chart with 24h history
  chartType?: SensorChartType; // chart type for the background chart
  roundTemperature?: boolean; // round temperature to nearest integer
}

export interface PersonCardFontSizes {
  locationSize?: number; // px
  batterySize?: number;  // px
  distanceSize?: number; // px
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
  calendarDayColor: "",
  calendarTimeColor: "",
  calendarDisplay: {
    showEventBody: false,
    showEndDate: false,
    hideAllDayText: false,
    showWeekNumber: false,
    fontSizeDay: 12,
    fontSizeTime: 10,
    fontSizeTitle: 14,
    fontSizeBody: 12,
  },
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
  foodMenuConfig: {
    calendarEntity: "",
    days: 5,
    skipWeekends: false,
  },
  generalSensors: [],
  sensorGrids: [],
  rssFeeds: [],
  globalFontSizes: { heading: 12, value: 18, body: 14, label: 10 },
  widgetFontSizes: {},
  personCardFontSizes: {},
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
