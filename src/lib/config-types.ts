// ── Dashboard Configuration Types ──

export interface WidgetStyleConfig {
  iconSize?: number;
  iconColor?: string;
  secondaryIconColor?: string;
  textColor?: string;
  labelColor?: string;
  valueColor?: string;
  headingColor?: string;
}

export interface WidgetFontSizes {
  heading?: number;
  value?: number;
  body?: number;
  label?: number;
}

export interface GlobalFontSizes {
  heading: number;
  value: number;
  body: number;
  label: number;
}

export interface WidgetLayout {
  colSpan: number;
  row: number;
  rowSpan: number;
  widgetGroup?: string;
}

export type PhotoTransition = "none" | "fade" | "slide" | "zoom" | "flip" | "blur";

export interface PhotoWidgetConfig {
  photos: string[];
  intervalSeconds: number;
  displayMode: "contain" | "cover" | "blur-fill";
  transition: PhotoTransition;
}

export interface CalendarEntityConfig {
  entityId: string;
  prefix: string;
  color: string;
  forecastDays?: number;
}

export interface CalendarDisplayConfig {
  showEventBody: boolean;
  showEndDate: boolean;
  hideAllDayText: boolean;
  hideClockIcon: boolean;
  showWeekNumber: boolean;
  firstDayOfWeek: 0 | 1 | 6;
  limitEvents: boolean;
  maxEvents: number;
  fontSizeDay: number;
  fontSizeTime: number;
  fontSizeTitle: number;
  fontSizeBody: number;
}

export type DateFormatStyle = "yyyy-MM-dd" | "dd/MM/yyyy" | "MM/dd/yyyy" | "dd.MM.yyyy";
export type TimeFormatStyle = "24h" | "12h";

export interface GlobalFormatConfig {
  dateFormat: DateFormatStyle;
  timeFormat: TimeFormatStyle;
}

export interface WeatherConfig {
  entityId: string;
  forecastDays: number;
  showPrecipitation: boolean;
  showSunrise: boolean;
  showSunset: boolean;
  clockTextSize?: number;
  clockTextColor?: string;
  tempIconSize?: number;
  tempTextSize?: number;
  tempTextColor?: string;
  sunIconSize?: number;
  sunTextSize?: number;
  sunTextColor?: string;
  sunIconColor?: string;
  chartDayTextSize?: number;
  chartDayTextColor?: string;
  chartIconSize?: number;
  showDate?: boolean;
  dateTextSize?: number;
  dateTextColor?: string;
}

export type FoodMenuSource = "calendar" | "skolmaten";
export type FoodMenuDisplayMode = "compact" | "menu";

export interface FoodMenuStyleConfig {
  dayColor: string;
  dateColor: string;
  mealColor: string;
  dayFontSize: number;
  dateFontSize: number;
  mealFontSize: number;
  dayFont: string;
  mealFont: string;
}

export interface FoodMenuConfig {
  source: FoodMenuSource;
  calendarEntity: string;
  skolmatenEntity: string;
  days: number;
  skipWeekends: boolean;
  displayMode: FoodMenuDisplayMode;
  showTitle?: boolean;
  style: FoodMenuStyleConfig;
}

export interface RssNewsConfig {
  id: string;
  label: string;
  feedUrl: string;
  maxItems: number;
}

export interface NotificationAlertRule {
  id: string;
  entityId: string;
  label: string;
  condition: "above" | "below" | "equals";
  threshold: number;
  icon: string;
  color: string;
  iconSize?: number;
  labelColor?: string;
  valueColor?: string;
}

export interface NotificationConfig {
  showHANotifications: boolean;
  alertRules: NotificationAlertRule[];
}

export interface VehicleEntityMapping {
  entityId: string;
  label: string;
  icon: string;
  unit: string;
  color: string;
}

export type VehicleSectionType = "battery" | "fuel" | "location" | "climate" | "doors" | "tires" | "custom";

export interface VehicleSection {
  id: string;
  type: VehicleSectionType;
  label: string;
  entities: VehicleEntityMapping[];
}

export interface PollenSensorConfig {
  entityId: string;
  label: string;
  icon: string;
  color: string;
  labelFontSize?: number;
  valueFontSize?: number;
}

export interface PollenConfig {
  sensors: PollenSensorConfig[];
  forecastDays: number;
  showLabel: boolean;
  showForecast: boolean;
  iconSize?: number;
  labelFontSize?: number;
  valueFontSize?: number;
  headingFontSize?: number;
  headingColor?: string;
}

export interface VehicleConfig {
  id: string;
  name: string;
  icon: string;
  sections: VehicleSection[];
  iconSize?: number;
  iconColor?: string;
  labelColor?: string;
  valueColor?: string;
  headingColor?: string;
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
  id: string;
  label: string;
  showLabel: boolean;
  icon: string;
  iconSize?: number;
  showGraph: boolean;
  historyHours: number;
  chartGrouping: ChartGrouping;
  chartAggregation?: ChartAggregation;
  chartSeries: SensorChartSeries[];
  topInfo: SensorInfoItem[];
  bottomInfo: SensorInfoItem[];
  fontSize?: WidgetFontSizes;
}

export interface SensorGridCellInterval {
  min: number;
  max: number;
  icon: string;
  color: string;
}

export interface SensorGridValueMap {
  from: string;
  to: string;
  icon?: string;
  color?: string;
}

export interface SensorGridVisibilityFilter {
  enabled: boolean;
  mode: "range" | "exact";
  rangeMin?: number;
  rangeMax?: number;
  exactValues?: string[];
}

export interface SensorGridCellConfig {
  entityId: string;
  label: string;
  icon: string;
  unit: string;
  color: string;
  valueColor?: string;
  iconSize?: number;
  fontSize?: number;
  labelFontSize?: number;
  useIntervals?: boolean;
  intervals?: SensorGridCellInterval[];
  valueMaps?: SensorGridValueMap[];
  visibilityFilter?: SensorGridVisibilityFilter;
  colSpan?: number;
  rowSpan?: number;
  order?: number;
  showChart?: boolean;
  chartType?: SensorChartType;
}

export interface SensorGridConfig {
  id: string;
  label: string;
  rows: number;
  columns: number;
  cells: SensorGridCellConfig[];
}

export type ThemeId = "midnight-teal" | "charcoal" | "deep-ocean" | "warm-ember" | "amoled-black" | "macos-dark";

export interface ChoreReminderConfig {
  enabled: boolean;
  weekdayHour: number;
  weekendHour: number;
  maxChoresInNotification: number;
  streakReminderEnabled: boolean;
  streakReminderHour: number;
}

export interface ChoreWidgetConfig {
  enabled: boolean;
  label: string;
  icon: string;
  showScoreboard: boolean;
  showUpcoming: boolean;
  showFairness: boolean;
  showCompleted: boolean;
  showAllChores: boolean;
  maxVisible: number;
  headingColor?: string;
  headingSize?: number;
  choreTextColor?: string;
  choreTextSize?: number;
  urgencyDotSize?: number;
  avatarSize?: number;
  ptsTextSize?: number;
  ptsTextColor?: string;
}

export interface TemperatureEntityConfig {
  entityId: string;
  humidityEntityId?: string;
  label: string;
  color: string;
  group?: number;
  showChart?: boolean;
  chartType?: SensorChartType;
  roundTemperature?: boolean;
  iconSize?: number;
  iconColor?: string;
  secondaryIconColor?: string;
  labelColor?: string;
  valueColor?: string;
  labelTextSize?: number;
  valueTextSize?: number;
  humidityTextSize?: number;
}

export interface PersonCardFontSizes {
  locationSize?: number;
  batterySize?: number;
  distanceSize?: number;
}

export interface PersonCustomSensor {
  entityId: string;
  icon: string;
  label?: string;
  attribute?: string;
}

export interface PersonEntityConfig {
  name: string;
  entityPicture: string;
  locationEntity: string;
  batteryEntity: string;
  batteryChargingEntity: string;
  distanceEntity: string;
  distanceUnit?: "km" | "m" | "mi" | "auto";
  avatarSize?: number;
  customSensors?: PersonCustomSensor[];
}

export interface DashboardConfig {
  haUrl: string;
  haToken: string;
  refreshInterval: number;
  calendarEntities: string[];
  calendarEntityConfigs: CalendarEntityConfig[];
  calendarDayColor: string;
  calendarTimeColor: string;
  calendarForecastDays: number;
  calendarDisplay: CalendarDisplayConfig;
  temperatureEntities: TemperatureEntityConfig[];
  electricityPriceEntity: string;
  electricityForecastEntity: string;
  electricitySurcharge: number;
  electricityStyle?: {
    priceTextSize?: number;
    priceTextColor?: string;
    unitTextSize?: number;
    unitTextColor?: string;
    statsTextSize?: number;
    statsTextColor?: string;
    axisTextSize?: number;
    axisTextColor?: string;
  };
  blackout: {
    enabled: boolean;
    from: string;
    to: string;
  };
  widgetLayouts: Record<string, WidgetLayout>;
  widgetOrder: string[];
  gridColumns: number;
  rowColumns: Record<number, number>;
  rowHeights: Record<number, number>;
  lockWidgetHeights: boolean;
  configBackendUrl: string;
  photoWidget: PhotoWidgetConfig;
  personEntities: PersonEntityConfig[];
  weatherConfig: WeatherConfig;
  theme: ThemeId;
  foodMenuConfig: FoodMenuConfig;
  generalSensors: GeneralSensorConfig[];
  sensorGrids: SensorGridConfig[];
  rssFeeds: RssNewsConfig[];
  notificationConfig: NotificationConfig;
  vehicles: VehicleConfig[];
  pollenConfig: PollenConfig;
  globalFontSizes: GlobalFontSizes;
  widgetFontSizes: Record<string, WidgetFontSizes>;
  widgetStyles: Record<string, WidgetStyleConfig>;
  personCardFontSizes: PersonCardFontSizes;
  globalFormat: GlobalFormatConfig;
  enableChores: boolean;
  choreWidgetConfig: ChoreWidgetConfig;
  choreReminderConfig: ChoreReminderConfig;
}

// ── Home Assistant Data Types ──

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
