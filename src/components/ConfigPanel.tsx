import { useState, useMemo, useRef } from "react";
import { Settings, X, Plus, Trash2, Save, GripVertical, Upload, Image, Download, ClipboardCopy, ClipboardPaste, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import PhotoManager from "@/components/PhotoManager";
import IconPicker from "@/components/IconPicker";
import type { DashboardConfig, TemperatureEntityConfig, WidgetLayout, PhotoWidgetConfig, PersonEntityConfig, PersonCardFontSizes, CalendarEntityConfig, CalendarDisplayConfig, WeatherConfig, ThemeId, FoodMenuConfig, GeneralSensorConfig, SensorChartType, SensorInfoItem, SensorChartSeries, ChartGrouping, ChartAggregation, SensorGridConfig, SensorGridCellConfig, SensorGridCellInterval, SensorGridValueMap, SensorGridVisibilityFilter, RssNewsConfig, GlobalFontSizes, WidgetFontSizes, NotificationConfig, NotificationAlertRule, GlobalFormatConfig, DateFormatStyle, TimeFormatStyle, VehicleConfig, VehicleSection, VehicleEntityMapping, WidgetStyleConfig } from "@/lib/config";
import { DEFAULT_FONT_SIZES } from "@/lib/fontSizes";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import ColorPicker from "@/components/ColorPicker";
import { THEMES } from "@/lib/config";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function CollapsibleSection({ title, actions, children, defaultOpen = false }: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            {title}
          </button>
        </CollapsibleTrigger>
        {actions}
      </div>
      <CollapsibleContent className="space-y-3 mt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ConfigPanelProps {
  config: DashboardConfig;
  onSave: (updates: Partial<DashboardConfig>) => void;
}

interface SortableWidgetItemProps {
  id: string;
  label: string;
  colSpan: number;
  row: number;
  rowSpan: number;
  widgetGroup: string;
  maxCols: number;
  fontSizes: WidgetFontSizes;
  onColSpanChange: (span: number) => void;
  onRowChange: (row: number) => void;
  onRowSpanChange: (span: number) => void;
  onWidgetGroupChange: (group: string) => void;
  onFontSizeChange: (sizes: WidgetFontSizes) => void;
}

const WIDGET_GROUPS = ["", "A", "B", "C", "D", "E", "F", "G", "H"];

function SortableWidgetItem({ id, label, colSpan, row, rowSpan, widgetGroup, maxCols, fontSizes, onColSpanChange, onRowChange, onRowSpanChange, onWidgetGroupChange, onFontSizeChange }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 space-y-1.5"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap pl-6">
        <Label className="text-[12px] text-muted-foreground">Group</Label>
        <Select value={widgetGroup} onValueChange={onWidgetGroupChange}>
          <SelectTrigger className="w-28 h-7 bg-muted border-border text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_GROUPS.map((g) => (
              <SelectItem key={g || "none"} value={g || "none"}>{g || "—"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Per-widget font sizes */}
      <div className="grid grid-cols-2 gap-1.5 pl-6">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground w-14">Heading</span>
          <Input type="number" min={6} max={60} placeholder="—" value={fontSizes.heading ?? ""} onChange={(e) => onFontSizeChange({ ...fontSizes, heading: e.target.value ? Number(e.target.value) : undefined })} className="w-full h-6 bg-muted border-border text-[12px] px-1" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground w-14">Value</span>
          <Input type="number" min={6} max={80} placeholder="—" value={fontSizes.value ?? ""} onChange={(e) => onFontSizeChange({ ...fontSizes, value: e.target.value ? Number(e.target.value) : undefined })} className="w-full h-6 bg-muted border-border text-[12px] px-1" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground w-14">Body</span>
          <Input type="number" min={6} max={60} placeholder="—" value={fontSizes.body ?? ""} onChange={(e) => onFontSizeChange({ ...fontSizes, body: e.target.value ? Number(e.target.value) : undefined })} className="w-full h-6 bg-muted border-border text-[12px] px-1" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground w-14">Label</span>
          <Input type="number" min={6} max={40} placeholder="—" value={fontSizes.label ?? ""} onChange={(e) => onFontSizeChange({ ...fontSizes, label: e.target.value ? Number(e.target.value) : undefined })} className="w-full h-6 bg-muted border-border text-[12px] px-1" />
        </div>
      </div>
    </div>
  );
}

function getTempGroupIds(entities: { group?: number }[]): string[] {
  const seen = new Set<number>();
  const ids: string[] = [];
  entities.forEach((e, i) => {
    const g = e.group ?? i;
    if (!seen.has(g)) {
      seen.add(g);
      ids.push(`temp_group_${g}`);
    }
  });
  return ids;
}

function getDefaultWidgetIds(tempEntities: { group?: number }[], personCount: number, generalSensorIds: string[], sensorGridIds: string[], rssIds: string[], hasNotifications = false, vehicleIds: string[] = []): string[] {
  return [
    ...getTempGroupIds(tempEntities),
    ...Array.from({ length: personCount }, (_, i) => `person_${i}`),
    "electricity",
    "calendar",
    "food_menu",
    "weather",
    "photos",
    ...generalSensorIds.map((id) => `general_${id}`),
    ...sensorGridIds.map((id) => `sensorgrid_${id}`),
    ...rssIds.map((id) => `rss_${id}`),
    ...(hasNotifications ? ["notifications"] : []),
    ...vehicleIds.map((id) => `vehicle_${id}`),
  ];
}

export default function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [haUrl, setHaUrl] = useState(config.haUrl);
  const [haToken, setHaToken] = useState(config.haToken);
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval);
  const [tempEntities, setTempEntities] = useState<TemperatureEntityConfig[]>(config.temperatureEntities);
  const [calendarEntityConfigs, setCalendarEntityConfigs] = useState<CalendarEntityConfig[]>(
    config.calendarEntityConfigs && config.calendarEntityConfigs.length > 0
      ? config.calendarEntityConfigs
      : config.calendarEntities.map((id) => ({ entityId: id, prefix: "", color: "" }))
  );
  const [calendarDayColor, setCalendarDayColor] = useState(config.calendarDayColor || "");
  const [calendarTimeColor, setCalendarTimeColor] = useState(config.calendarTimeColor || "");
  const [calendarDisplay, setCalendarDisplay] = useState<CalendarDisplayConfig>(
    config.calendarDisplay || {
      showEventBody: false, showEndDate: false, hideAllDayText: false, hideClockIcon: false, showWeekNumber: false,
      firstDayOfWeek: 1,
      fontSizeDay: 12, fontSizeTime: 10, fontSizeTitle: 14, fontSizeBody: 12,
    }
  );
  const [weatherConfig, setWeatherConfig] = useState<WeatherConfig>(
    config.weatherConfig || { entityId: "weather.home", forecastDays: 5, showPrecipitation: true, showSunrise: true, showSunset: true }
  );
  const [electricityEntity, setElectricityEntity] = useState(config.electricityPriceEntity);
  const [electricitySurcharge, setElectricitySurcharge] = useState(config.electricitySurcharge ?? 0);
  const [widgetLayouts, setWidgetLayouts] = useState<Record<string, WidgetLayout>>(config.widgetLayouts || {});
  const [gridColumns, setGridColumns] = useState(config.gridColumns || 4);
  const [rowColumns, setRowColumns] = useState<Record<number, number>>(config.rowColumns || {});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>(config.rowHeights || {});
  const [photoConfig, setPhotoConfig] = useState<PhotoWidgetConfig>(config.photoWidget || { photos: [], intervalSeconds: 10, displayMode: "contain" });
  const [personEntities, setPersonEntities] = useState<PersonEntityConfig[]>(config.personEntities || []);
  const [theme, setTheme] = useState<ThemeId>(config.theme || "midnight-teal");
  const [blackout, setBlackout] = useState(config.blackout || { enabled: false, from: "23:00", to: "06:00" });
  const defaultFoodStyle = { dayColor: "", dateColor: "", mealColor: "", dayFontSize: 0, dateFontSize: 0, mealFontSize: 0, dayFont: "", mealFont: "" };
  const [foodMenuConfig, setFoodMenuConfig] = useState<FoodMenuConfig>({ source: "calendar", calendarEntity: "", skolmatenEntity: "", days: 5, skipWeekends: false, displayMode: "compact", style: defaultFoodStyle, ...config.foodMenuConfig });
  const [generalSensors, setGeneralSensors] = useState<GeneralSensorConfig[]>(config.generalSensors || []);
  const [sensorGrids, setSensorGrids] = useState<SensorGridConfig[]>(config.sensorGrids || []);
  const [rssFeeds, setRssFeeds] = useState<RssNewsConfig[]>(config.rssFeeds || []);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(
    config.notificationConfig || { showHANotifications: true, alertRules: [] }
  );
  const [vehicles, setVehicles] = useState<VehicleConfig[]>(config.vehicles || []);
  const [globalFontSizes, setGlobalFontSizes] = useState<GlobalFontSizes>(config.globalFontSizes || DEFAULT_FONT_SIZES);
  const [widgetFontSizes, setWidgetFontSizes] = useState<Record<string, WidgetFontSizes>>(config.widgetFontSizes || {});
  const [personCardFontSizes, setPersonCardFontSizes] = useState<PersonCardFontSizes>(config.personCardFontSizes || {});
  const [widgetStyles, setWidgetStyles] = useState<Record<string, WidgetStyleConfig>>(config.widgetStyles || {});
  const getStyle = (id: string): WidgetStyleConfig => widgetStyles[id] || {};
  const setStyle = (id: string, s: WidgetStyleConfig) => setWidgetStyles(prev => ({ ...prev, [id]: s }));
  const [globalFormat, setGlobalFormat] = useState<GlobalFormatConfig>(config.globalFormat || { dateFormat: "yyyy-MM-dd", timeFormat: "24h" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasNotif = notificationConfig.showHANotifications || (notificationConfig.alertRules?.length > 0);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const gsIds = (config.generalSensors || []).map((s) => s.id);
    const sgIds = (config.sensorGrids || []).map((s) => s.id);
    const rsIds = (config.rssFeeds || []).map((s) => s.id);
    const vcIds = (config.vehicles || []).map((v) => v.id);
    const hn = (config.notificationConfig?.showHANotifications || (config.notificationConfig?.alertRules?.length > 0)) ?? false;
    const defaults = getDefaultWidgetIds(config.temperatureEntities, (config.personEntities || []).length, gsIds, sgIds, rsIds, hn, vcIds);
    if (config.widgetOrder && config.widgetOrder.length > 0) {
      const validSet = new Set(defaults);
      const ordered = config.widgetOrder.filter((id) => validSet.has(id));
      const missing = defaults.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    }
    return defaults;
  });

  const widgetItems = useMemo(() => {
    const labelMap: Record<string, string> = {
      electricity: "Electricity Price", calendar: "Calendar", weather: "Weather", photos: "Photo Gallery",
      food_menu: "Food Menu", notifications: "Notifications",
    };
    const groupMap = new Map<number, string[]>();
    tempEntities.forEach((e, i) => {
      const g = e.group ?? i;
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(e.label || `Sensor ${i + 1}`);
    });
    groupMap.forEach((labels, g) => { labelMap[`temp_group_${g}`] = labels.join(" / "); });
    personEntities.forEach((p, i) => { labelMap[`person_${i}`] = p.name || `Person ${i + 1}`; });
    generalSensors.forEach((gs) => { labelMap[`general_${gs.id}`] = gs.label || `Sensor ${gs.id}`; });
    sensorGrids.forEach((sg) => { labelMap[`sensorgrid_${sg.id}`] = sg.label || `Grid ${sg.id}`; });
    rssFeeds.forEach((rf) => { labelMap[`rss_${rf.id}`] = rf.label || `RSS ${rf.id}`; });
    vehicles.forEach((vc) => { labelMap[`vehicle_${vc.id}`] = vc.name || `Vehicle ${vc.id}`; });

    const gsIds = generalSensors.map((s) => s.id);
    const sgIds = sensorGrids.map((s) => s.id);
    const rsIds = rssFeeds.map((s) => s.id);
    const vcIds = vehicles.map((v) => v.id);
    const defaults = getDefaultWidgetIds(tempEntities, personEntities.length, gsIds, sgIds, rsIds, hasNotif, vcIds);
    const validSet = new Set(defaults);
    const currentValid = widgetOrder.filter((id) => validSet.has(id));
    const missing = defaults.filter((id) => !currentValid.includes(id));
    const finalOrder = [...currentValid, ...missing];

    return finalOrder.map((id) => ({
      id,
      label: labelMap[id] || id,
      defaultSpan: ["electricity", "calendar", "photos", "food_menu"].includes(id) || id.startsWith("general_") || id.startsWith("sensorgrid_") || id.startsWith("rss_") ? 2 : 1,
    }));
  }, [widgetOrder, tempEntities, personEntities, generalSensors, sensorGrids, rssFeeds, vehicles]);

  const getColSpan = (id: string, fallback = 1) => widgetLayouts[id]?.colSpan || fallback;
  const getRow = (id: string, fallback = 1) => widgetLayouts[id]?.row || fallback;
  const getRowSpan = (id: string, fallback = 1) => widgetLayouts[id]?.rowSpan || fallback;
  const updateLayout = (id: string, updates: Partial<WidgetLayout>) =>
    setWidgetLayouts((prev) => ({
      ...prev,
      [id]: { colSpan: prev[id]?.colSpan || 1, row: prev[id]?.row || 1, rowSpan: prev[id]?.rowSpan || 1, ...updates },
    }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = widgetItems.map((w) => w.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      setWidgetOrder(newOrder);
    }
  };

  const handleSave = () => {
    const finalOrder = widgetItems.map((w) => w.id);
    onSave({
      haUrl,
      haToken,
      refreshInterval,
      temperatureEntities: tempEntities,
      calendarEntities: calendarEntityConfigs.map((c) => c.entityId),
      calendarEntityConfigs,
      calendarDayColor,
      calendarTimeColor,
      calendarDisplay,
      electricityPriceEntity: electricityEntity,
      electricitySurcharge,
      blackout,
      widgetLayouts,
      widgetOrder: finalOrder,
      gridColumns,
      rowColumns,
      rowHeights,
      configBackendUrl: "",
      photoWidget: photoConfig,
      personEntities,
      weatherConfig,
      theme,
      foodMenuConfig: foodMenuConfig,
      generalSensors,
      sensorGrids,
      rssFeeds,
      notificationConfig,
      vehicles,
      globalFontSizes,
      widgetFontSizes,
      widgetStyles,
      personCardFontSizes,
      globalFormat,
    });
    setOpen(false);
  };

  const addTempEntity = () => {
    const newEntity = { entityId: "", label: "", color: "hsl(174, 72%, 50%)", group: tempEntities.length };
    setTempEntities([...tempEntities, newEntity]);
  };

  const removeTempEntity = (index: number) => {
    setTempEntities(tempEntities.filter((_, i) => i !== index));
  };

  const updateTempEntity = (index: number, updates: Partial<TemperatureEntityConfig>) => {
    setTempEntities(tempEntities.map((e, i) => (i === index ? { ...e, ...updates } : e)));
  };

  

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-50 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-5 w-5" />
      </Button>
    );
}

const STYLE_FIELD_LABELS: Record<keyof WidgetStyleConfig, string> = {
  iconSize: "Icon Size (px)",
  iconColor: "Icon Color",
  secondaryIconColor: "2nd Icon Color",
  textColor: "Text Color",
  labelColor: "Label Color",
  valueColor: "Value Color",
  headingColor: "Heading Color",
};

function WidgetStyleControls({ style, onChange, fields }: {
  style: WidgetStyleConfig;
  onChange: (s: WidgetStyleConfig) => void;
  fields: (keyof WidgetStyleConfig)[];
}) {
  return (
    <div className="space-y-2 mt-3">
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => {
          if (field === "iconSize") {
            return (
              <div key={field}>
                <Label className="text-[10px] text-muted-foreground">{STYLE_FIELD_LABELS[field]}</Label>
                <Input type="number" min={8} max={64} value={style.iconSize || ""} onChange={(e) => onChange({ ...style, iconSize: Number(e.target.value) || undefined })} placeholder="auto" className="bg-muted border-border text-xs h-7" />
              </div>
            );
          }
          return (
            <div key={field}>
              <Label className="text-[10px] text-muted-foreground">{STYLE_FIELD_LABELS[field]}</Label>
              <ColorPicker value={(style[field] as string) || ""} onChange={(val) => onChange({ ...style, [field]: val || undefined })} className="w-full" />
            </div>
          );
        })}
      </div>
    </div>
  );
}




  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative h-full flex flex-col border-l border-border bg-card shadow-2xl w-2/3 max-w-full">
        {/* Sticky header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Dashboard Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="connection" className="flex-1 text-xs">Connection</TabsTrigger>
            <TabsTrigger value="widgets" className="flex-1 text-xs">Widgets</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1 text-xs">Photos</TabsTrigger>
            <TabsTrigger value="layout" className="flex-1 text-xs">Layout</TabsTrigger>
          </TabsList>

          {/* ===== CONNECTION TAB ===== */}
          <TabsContent value="connection" className="space-y-6 mt-0">
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
                Home Assistant Connection
              </h3>
              <div>
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input
                  value={haUrl}
                  onChange={(e) => setHaUrl(e.target.value)}
                  placeholder="http://192.168.1.x:8123"
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Long-Lived Access Token</Label>
                <Input
                  value={haToken}
                  onChange={(e) => setHaToken(e.target.value)}
                  type="password"
                  placeholder="eyJ..."
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Refresh Interval (seconds)</Label>
                <Input
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  type="number"
                  min={5}
                  className="mt-1 bg-muted border-border"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Theme</h3>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                      theme === t.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Screen Blackout</h3>
              <div className="flex items-center gap-3">
                <Switch
                  checked={blackout.enabled}
                  onCheckedChange={(checked) => setBlackout({ ...blackout, enabled: checked })}
                />
                <Label className="text-sm text-foreground">Enable scheduled blackout (kiosk mode only)</Label>
              </div>
              {blackout.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="time"
                      value={blackout.from}
                      onChange={(e) => setBlackout({ ...blackout, from: e.target.value })}
                      className="mt-1 bg-muted border-border text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="time"
                      value={blackout.to}
                      onChange={(e) => setBlackout({ ...blackout, to: e.target.value })}
                      className="mt-1 bg-muted border-border text-sm"
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Import / Export Config</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const json = JSON.stringify(config, null, 2);
                    const blob = new Blob([json], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "homedash-config.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" /> Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const imported = JSON.parse(ev.target?.result as string);
                          onSave(imported);
                          setOpen(false);
                          window.location.reload();
                        } catch {
                          alert("Invalid config file");
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="mr-1 h-3 w-3" /> Import
                </Button>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Export downloads your current config as JSON. Import loads a previously exported config file.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Date & Time Format</h3>
              <p className="text-[12px] text-muted-foreground">These settings affect formatting across all widgets.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Date format</Label>
                  <Select
                    value={globalFormat.dateFormat}
                    onValueChange={(v) => setGlobalFormat({ ...globalFormat, dateFormat: v as DateFormatStyle })}
                  >
                    <SelectTrigger className="mt-1 bg-muted border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yyyy-MM-dd">2025-02-21 (ISO)</SelectItem>
                      <SelectItem value="dd/MM/yyyy">21/02/2025</SelectItem>
                      <SelectItem value="MM/dd/yyyy">02/21/2025</SelectItem>
                      <SelectItem value="dd.MM.yyyy">21.02.2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time format</Label>
                  <Select
                    value={globalFormat.timeFormat}
                    onValueChange={(v) => setGlobalFormat({ ...globalFormat, timeFormat: v as TimeFormatStyle })}
                  >
                    <SelectTrigger className="mt-1 bg-muted border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

          </TabsContent>

          {/* ===== WIDGETS TAB ===== */}
          <TabsContent value="widgets" className="space-y-6 mt-0">
            {/* Temperature Sensors */}
            <CollapsibleSection
              title="Temperature Sensors"
              actions={
                <Button variant="ghost" size="sm" onClick={addTempEntity} className="text-primary">
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {tempEntities.map((entity, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sensor {i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTempEntity(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <EntityAutocomplete
                    value={entity.entityId}
                    onChange={(val) => updateTempEntity(i, { entityId: val })}
                    config={config}
                    domainFilter="sensor"
                    placeholder="sensor.living_room_temperature"
                    className="bg-muted border-border text-sm"
                  />
                  <div>
                    <Label className="text-xs text-muted-foreground">Humidity Entity (optional)</Label>
                    <EntityAutocomplete
                      value={entity.humidityEntityId || ""}
                      onChange={(val) => updateTempEntity(i, { humidityEntityId: val || undefined })}
                      config={config}
                      domainFilter="sensor"
                      placeholder="sensor.living_room_humidity"
                      className="mt-1 bg-muted border-border text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={entity.label}
                      onChange={(e) => updateTempEntity(i, { label: e.target.value })}
                      placeholder="Label"
                      className="bg-muted border-border text-sm"
                    />
                    <ColorPicker
                      value={entity.color}
                      onChange={(val) => updateTempEntity(i, { color: val })}
                      className="w-48"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Widget Group</Label>
                    <Select
                      value={String(entity.group ?? i)}
                      onValueChange={(v) => updateTempEntity(i, { group: Number(v) })}
                    >
                      <SelectTrigger className="mt-1 bg-muted border-border text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: tempEntities.length }, (_, g) => (
                          <SelectItem key={g} value={String(g)}>Group {g + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entity.showChart ?? false}
                        onChange={(e) => updateTempEntity(i, { showChart: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">Show 24h chart</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entity.roundTemperature ?? false}
                        onChange={(e) => updateTempEntity(i, { roundTemperature: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">Round temperature</span>
                    </label>
                    {entity.showChart && (
                      <Select
                        value={entity.chartType || "line"}
                        onValueChange={(v) => updateTempEntity(i, { chartType: v as any })}
                      >
                        <SelectTrigger className="w-24 h-7 bg-muted border-border text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line</SelectItem>
                          <SelectItem value="area">Area</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="step">Step</SelectItem>
                          <SelectItem value="scatter">Scatter</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
              {/* Temperature Styling - shared across all temp groups */}
              <WidgetStyleControls
                style={getStyle("temperature")}
                onChange={(s) => setStyle("temperature", s)}
                fields={["iconSize", "iconColor", "secondaryIconColor", "labelColor", "valueColor"]}
              />
            </CollapsibleSection>

            {/* Calendar */}
            <CollapsibleSection
              title="Calendar"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarEntityConfigs([...calendarEntityConfigs, { entityId: "", prefix: "", color: "" }])}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {calendarEntityConfigs.map((cal, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Calendar {i + 1}</span>
                    {calendarEntityConfigs.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setCalendarEntityConfigs(calendarEntityConfigs.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <EntityAutocomplete
                    value={cal.entityId}
                    onChange={(val) => {
                      const updated = [...calendarEntityConfigs];
                      updated[i] = { ...updated[i], entityId: val };
                      setCalendarEntityConfigs(updated);
                    }}
                    config={config}
                    domainFilter="calendar"
                    placeholder="calendar.family"
                    className="bg-muted border-border text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Prefix</Label>
                      <Input
                        value={cal.prefix}
                        onChange={(e) => {
                          const updated = [...calendarEntityConfigs];
                          updated[i] = { ...updated[i], prefix: e.target.value };
                          setCalendarEntityConfigs(updated);
                        }}
                        placeholder="e.g. 🏠 or [Work]"
                        className="mt-1 bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Days ahead</Label>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={cal.forecastDays || ""}
                        onChange={(e) => {
                          const updated = [...calendarEntityConfigs];
                          updated[i] = { ...updated[i], forecastDays: Number(e.target.value) || undefined };
                          setCalendarEntityConfigs(updated);
                        }}
                        placeholder="global"
                        className="mt-1 bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="w-48">
                      <Label className="text-xs text-muted-foreground">Text Color</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={cal.color && cal.color.startsWith("#") ? cal.color : "#ffffff"}
                          onChange={(e) => {
                            const updated = [...calendarEntityConfigs];
                            updated[i] = { ...updated[i], color: e.target.value };
                            setCalendarEntityConfigs(updated);
                          }}
                          className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                        />
                        <Input
                          value={cal.color}
                          onChange={(e) => {
                            const updated = [...calendarEntityConfigs];
                            updated[i] = { ...updated[i], color: e.target.value };
                            setCalendarEntityConfigs(updated);
                          }}
                          placeholder="#3b82f6"
                          className="bg-muted border-border text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Global forecast days */}
              <div>
                <Label className="text-xs text-muted-foreground">Default days ahead (all calendars)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={config.calendarForecastDays || 7}
                  onChange={(e) => onSave({ calendarForecastDays: Number(e.target.value) || 7 })}
                  className="mt-1 bg-muted border-border text-sm w-24"
                />
              </div>

              {/* General calendar colors */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Day Label Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={calendarDayColor && calendarDayColor.startsWith("#") ? calendarDayColor : "#ffffff"}
                      onChange={(e) => setCalendarDayColor(e.target.value)}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={calendarDayColor}
                      onChange={(e) => setCalendarDayColor(e.target.value)}
                      placeholder="default"
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Time Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={calendarTimeColor && calendarTimeColor.startsWith("#") ? calendarTimeColor : "#ffffff"}
                      onChange={(e) => setCalendarTimeColor(e.target.value)}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={calendarTimeColor}
                      onChange={(e) => setCalendarTimeColor(e.target.value)}
                      placeholder="default"
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Calendar display options */}
              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={calendarDisplay.showEventBody}
                      onCheckedChange={(v) => setCalendarDisplay({ ...calendarDisplay, showEventBody: !!v })}
                    />
                    Show event body
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={calendarDisplay.showEndDate}
                      onCheckedChange={(v) => setCalendarDisplay({ ...calendarDisplay, showEndDate: !!v })}
                    />
                    Show end time
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={calendarDisplay.hideAllDayText}
                      onCheckedChange={(v) => setCalendarDisplay({ ...calendarDisplay, hideAllDayText: !!v })}
                    />
                    Hide "All day" text
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={calendarDisplay.hideClockIcon}
                      onCheckedChange={(v) => setCalendarDisplay({ ...calendarDisplay, hideClockIcon: !!v })}
                    />
                    Hide clock icon
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={calendarDisplay.showWeekNumber}
                      onCheckedChange={(v) => setCalendarDisplay({ ...calendarDisplay, showWeekNumber: !!v })}
                    />
                    Show week number
                  </label>
                </div>

                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">First day of week</Label>
                  <Select
                    value={String(calendarDisplay.firstDayOfWeek ?? 1)}
                    onValueChange={(v) => setCalendarDisplay({ ...calendarDisplay, firstDayOfWeek: Number(v) as 0 | 1 | 6 })}
                  >
                    <SelectTrigger className="mt-1 bg-muted border-border text-sm w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-3">Font Sizes & Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["fontSizeDay", "Day Label Text Size", "headingColor", "Day Label Color"],
                    ["fontSizeTime", "Time Text Size", "labelColor", "Time Color"],
                    ["fontSizeTitle", "Event Title Text Size", "valueColor", "Event Title Color"],
                    ["fontSizeBody", "Event Body Text Size", null, null],
                  ] as const).map(([key, label, colorKey, colorLabel]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        min={6}
                        max={48}
                        value={calendarDisplay[key]}
                        onChange={(e) => setCalendarDisplay({ ...calendarDisplay, [key]: Number(e.target.value) || 12 })}
                        className="bg-muted border-border text-sm"
                      />
                      {colorKey && (
                        <>
                          <Label className="text-[10px] text-muted-foreground">{colorLabel}</Label>
                          <ColorPicker
                            value={(getStyle("calendar")[colorKey as keyof WidgetStyleConfig] as string) || ""}
                            onChange={(val) => setStyle("calendar", { ...getStyle("calendar"), [colorKey]: val || undefined })}
                            className="w-full"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Icon Size (px)</Label>
                    <Input type="number" min={8} max={64} value={getStyle("calendar").iconSize || ""} onChange={(e) => setStyle("calendar", { ...getStyle("calendar"), iconSize: Number(e.target.value) || undefined })} placeholder="auto" className="bg-muted border-border text-xs h-7" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Icon Color</Label>
                    <ColorPicker value={getStyle("calendar").iconColor || ""} onChange={(val) => setStyle("calendar", { ...getStyle("calendar"), iconColor: val || undefined })} className="w-full" />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Weather */}
            <CollapsibleSection title="Weather">
              <div>
                <Label className="text-xs text-muted-foreground">Weather Entity</Label>
                <EntityAutocomplete
                  value={weatherConfig.entityId}
                  onChange={(val) => setWeatherConfig((prev) => ({ ...prev, entityId: val }))}
                  config={config}
                  domainFilter="weather"
                  placeholder="weather.home"
                  className="mt-1 bg-muted border-border text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Forecast Days</Label>
                <Input
                  value={weatherConfig.forecastDays}
                  onChange={(e) => setWeatherConfig((prev) => ({ ...prev, forecastDays: Number(e.target.value) || 5 }))}
                  type="number"
                  min={1}
                  max={14}
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={weatherConfig.showPrecipitation} onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showPrecipitation: e.target.checked }))} className="rounded border-border" />
                  Show Precipitation
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={weatherConfig.showSunrise} onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showSunrise: e.target.checked }))} className="rounded border-border" />
                  Show Sunrise
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={weatherConfig.showSunset} onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showSunset: e.target.checked }))} className="rounded border-border" />
                  Show Sunset
                </label>
              </div>
              <WidgetStyleControls
                style={getStyle("weather")}
                onChange={(s) => setStyle("weather", s)}
                fields={["iconSize", "iconColor", "labelColor", "valueColor", "headingColor"]}
              />
            </CollapsibleSection>

            {/* Food Menu */}
            <CollapsibleSection title="Food Menu">
              <div>
                <Label className="text-xs text-muted-foreground">Source</Label>
                <select
                  value={foodMenuConfig.source || "calendar"}
                  onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, source: e.target.value as "calendar" | "skolmaten" }))}
                  className="mt-1 w-full rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground"
                >
                  <option value="calendar">Calendar Entity</option>
                  <option value="skolmaten">Skolmaten Sensor</option>
                </select>
              </div>
              {(foodMenuConfig.source || "calendar") === "calendar" ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Calendar Entity</Label>
                  <EntityAutocomplete
                    value={foodMenuConfig.calendarEntity}
                    onChange={(val) => setFoodMenuConfig((prev) => ({ ...prev, calendarEntity: val }))}
                    config={config}
                    domainFilter="calendar"
                    placeholder="calendar.food_menu"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground">Skolmaten Sensor Entity</Label>
                  <EntityAutocomplete
                    value={foodMenuConfig.skolmatenEntity || ""}
                    onChange={(val) => setFoodMenuConfig((prev) => ({ ...prev, skolmatenEntity: val }))}
                    config={config}
                    domainFilter="sensor"
                    placeholder="sensor.schoolname"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Days to Show</Label>
                <Input
                  value={foodMenuConfig.days}
                  onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, days: Number(e.target.value) || 5 }))}
                  type="number"
                  min={1}
                  max={14}
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="skipWeekends"
                  checked={foodMenuConfig.skipWeekends ?? false}
                  onCheckedChange={(checked) => setFoodMenuConfig((prev) => ({ ...prev, skipWeekends: !!checked }))}
                />
                <Label htmlFor="skipWeekends" className="text-xs text-muted-foreground cursor-pointer">Skip weekends (Sat &amp; Sun)</Label>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="showMenuTitle"
                  checked={foodMenuConfig.showTitle !== false}
                  onCheckedChange={(checked) => setFoodMenuConfig((prev) => ({ ...prev, showTitle: !!checked }))}
                />
                <Label htmlFor="showMenuTitle" className="text-xs text-muted-foreground cursor-pointer">Show "MENU" title and icon</Label>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Display Mode</Label>
                <select
                  value={foodMenuConfig.displayMode || "compact"}
                  onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, displayMode: e.target.value as "compact" | "menu" }))}
                  className="mt-1 w-full rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground"
                >
                  <option value="compact">Compact (side-by-side)</option>
                  <option value="menu">Menu Style (restaurant)</option>
                </select>
              </div>

              {/* Styling */}
              <div className="border-t border-border pt-2 mt-2 space-y-2">
                <Label className="text-xs text-muted-foreground font-semibold">Styling</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Day Color</Label>
                    <ColorPicker value={foodMenuConfig.style?.dayColor || ""} onChange={(val) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, dayColor: val } }))} className="w-full" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Date Color</Label>
                    <ColorPicker value={foodMenuConfig.style?.dateColor || ""} onChange={(val) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, dateColor: val } }))} className="w-full" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Meal Color</Label>
                    <ColorPicker value={foodMenuConfig.style?.mealColor || ""} onChange={(val) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, mealColor: val } }))} className="w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Day Size (px)</Label>
                    <Input value={foodMenuConfig.style?.dayFontSize || ""} onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, dayFontSize: Number(e.target.value) || 0 } }))} type="number" min={0} max={48} placeholder="auto" className="bg-muted border-border text-xs h-7" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Date Size (px)</Label>
                    <Input value={foodMenuConfig.style?.dateFontSize || ""} onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, dateFontSize: Number(e.target.value) || 0 } }))} type="number" min={0} max={48} placeholder="auto" className="bg-muted border-border text-xs h-7" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Meal Size (px)</Label>
                    <Input value={foodMenuConfig.style?.mealFontSize || ""} onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, mealFontSize: Number(e.target.value) || 0 } }))} type="number" min={0} max={48} placeholder="auto" className="bg-muted border-border text-xs h-7" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Day Font</Label>
                    <select value={foodMenuConfig.style?.dayFont || ""} onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, dayFont: e.target.value } }))} className="mt-0.5 w-full rounded-md bg-muted border border-border px-2 py-1 text-xs text-foreground">
                      <option value="">Default</option>
                      <option value="Inter">Inter</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="serif">Serif</option>
                      <option value="cursive">Cursive</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Meal Font</Label>
                    <select value={foodMenuConfig.style?.mealFont || ""} onChange={(e) => setFoodMenuConfig((prev) => ({ ...prev, style: { ...defaultFoodStyle, ...prev.style, mealFont: e.target.value } }))} className="mt-0.5 w-full rounded-md bg-muted border border-border px-2 py-1 text-xs text-foreground">
                      <option value="">Default</option>
                      <option value="Inter">Inter</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="serif">Serif</option>
                      <option value="cursive">Cursive</option>
                    </select>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Electricity */}
            <CollapsibleSection title="Electricity Price">
              <div>
                <Label className="text-xs text-muted-foreground">Nordpool Entity</Label>
                <EntityAutocomplete
                  value={electricityEntity}
                  onChange={setElectricityEntity}
                  config={config}
                  domainFilter="sensor"
                  placeholder="sensor.nordpool_kwh_se3_sek_3_10_025"
                  className="mt-1 bg-muted border-border text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Uses raw_today & raw_tomorrow attributes for 48h view
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Surcharge (kr/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={electricitySurcharge}
                  onChange={(e) => setElectricitySurcharge(parseFloat(e.target.value) || 0)}
                  className="mt-1 bg-muted border-border text-sm"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Added to all electricity prices (chart, current, avg, min, max)
                </p>
              </div>
              <WidgetStyleControls
                style={getStyle("electricity")}
                onChange={(s) => setStyle("electricity", s)}
                fields={["labelColor", "valueColor"]}
              />
            </CollapsibleSection>

            {/* Person Cards */}
            <CollapsibleSection
              title="Person Cards"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPersonEntities([...personEntities, {
                      name: "", entityPicture: "", locationEntity: "",
                      batteryEntity: "", batteryChargingEntity: "", distanceEntity: "",
                    }]);
                    setWidgetOrder((prev) => [...prev, `person_${personEntities.length}`]);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {/* Person Card Font Sizes */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Text Sizes (all person cards)</span>
                <div className="flex gap-2 flex-wrap">
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">Location px</Label>
                    <Input type="number" min={8} max={48} value={personCardFontSizes.locationSize || ""} onChange={(e) => setPersonCardFontSizes((p) => ({ ...p, locationSize: Number(e.target.value) || undefined }))} placeholder="14" className="mt-1 bg-muted border-border text-xs h-8" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">Battery px</Label>
                    <Input type="number" min={8} max={48} value={personCardFontSizes.batterySize || ""} onChange={(e) => setPersonCardFontSizes((p) => ({ ...p, batterySize: Number(e.target.value) || undefined }))} placeholder="12" className="mt-1 bg-muted border-border text-xs h-8" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">Distance px</Label>
                    <Input type="number" min={8} max={48} value={personCardFontSizes.distanceSize || ""} onChange={(e) => setPersonCardFontSizes((p) => ({ ...p, distanceSize: Number(e.target.value) || undefined }))} placeholder="14" className="mt-1 bg-muted border-border text-xs h-8" />
                  </div>
                </div>
              </div>
              {personEntities.map((person, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Person {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => {
                        setPersonEntities(personEntities.filter((_, j) => j !== i));
                        setWidgetOrder((prev) => prev.filter((id) => id !== `person_${i}`).map((id) => {
                          if (id.startsWith("person_")) {
                            const idx = parseInt(id.split("_")[1], 10);
                            if (idx > i) return `person_${idx - 1}`;
                          }
                          return id;
                        }));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={person.name}
                    onChange={(e) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setPersonEntities(updated);
                    }}
                    placeholder="Name (e.g. John)"
                    className="bg-muted border-border text-sm"
                  />
                  <div>
                    <Label className="text-xs text-muted-foreground">Person Entity (for picture)</Label>
                    <EntityAutocomplete value={person.entityPicture} onChange={(val) => { const u = [...personEntities]; u[i] = { ...u[i], entityPicture: val }; setPersonEntities(u); }} config={config} domainFilter="person" placeholder="person.john" className="mt-1 bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location Sensor</Label>
                    <EntityAutocomplete value={person.locationEntity} onChange={(val) => { const u = [...personEntities]; u[i] = { ...u[i], locationEntity: val }; setPersonEntities(u); }} config={config} domainFilter="sensor" placeholder="sensor.john_geocoded_location" className="mt-1 bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Battery Sensor</Label>
                    <EntityAutocomplete value={person.batteryEntity} onChange={(val) => { const u = [...personEntities]; u[i] = { ...u[i], batteryEntity: val }; setPersonEntities(u); }} config={config} domainFilter="sensor" placeholder="sensor.john_phone_battery_level" className="mt-1 bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Charging Sensor (binary)</Label>
                    <EntityAutocomplete value={person.batteryChargingEntity} onChange={(val) => { const u = [...personEntities]; u[i] = { ...u[i], batteryChargingEntity: val }; setPersonEntities(u); }} config={config} domainFilter="binary_sensor" placeholder="binary_sensor.john_phone_is_charging" className="mt-1 bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Distance from Home (km)</Label>
                    <EntityAutocomplete value={person.distanceEntity} onChange={(val) => { const u = [...personEntities]; u[i] = { ...u[i], distanceEntity: val }; setPersonEntities(u); }} config={config} domainFilter="sensor" placeholder="sensor.john_distance_from_home" className="mt-1 bg-muted border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Avatar Size (px)</Label>
                    <Input
                      value={person.avatarSize || 80}
                      onChange={(e) => { const u = [...personEntities]; u[i] = { ...u[i], avatarSize: Number(e.target.value) || 80 }; setPersonEntities(u); }}
                      type="number" min={40} max={300} placeholder="80"
                      className="mt-1 bg-muted border-border text-sm"
                    />
                  </div>
                </div>
              ))}
              <WidgetStyleControls
                style={getStyle("person")}
                onChange={(s) => setStyle("person", s)}
                fields={["iconSize", "iconColor", "labelColor", "valueColor"]}
              />
            </CollapsibleSection>

            {/* General Sensors */}
            <CollapsibleSection
              title="General Sensors"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const id = `gs_${Date.now()}`;
                    setGeneralSensors([...generalSensors, {
                       id, label: "", showLabel: true, icon: "activity",
                       showGraph: true, historyHours: 24, chartGrouping: "hour" as ChartGrouping,
                       chartSeries: [], topInfo: [], bottomInfo: [],
                    }]);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {generalSensors.map((gs, gsIdx) => (
                <div key={gs.id} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sensor Card {gsIdx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setGeneralSensors(generalSensors.filter((_, j) => j !== gsIdx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input value={gs.label} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], label: e.target.value }; setGeneralSensors(u); }} placeholder="Power Meter" className="mt-1 bg-muted border-border text-sm" />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Show Label</Label>
                      <Select value={gs.showLabel ? "yes" : "no"} onValueChange={(v) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], showLabel: v === "yes" }; setGeneralSensors(u); }}>
                        <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Icon (mdi name)</Label>
                      <IconPicker value={gs.icon} onChange={(val) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], icon: val }; setGeneralSensors(u); }} placeholder="mdi:activity" className="mt-1 bg-muted border-border text-sm" />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Graph</Label>
                      <Select value={gs.showGraph ? "yes" : "no"} onValueChange={(v) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], showGraph: v === "yes" }; setGeneralSensors(u); }}>
                        <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                       <Label className="text-xs text-muted-foreground">History</Label>
                       <Select value={String(gs.historyHours)} onValueChange={(v) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], historyHours: Number(v) }; setGeneralSensors(u); }}>
                         <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="1">1h</SelectItem>
                           <SelectItem value="6">6h</SelectItem>
                           <SelectItem value="24">24h</SelectItem>
                           <SelectItem value="168">7d</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="w-24">
                       <Label className="text-xs text-muted-foreground">Group by</Label>
                       <Select value={gs.chartGrouping || "hour"} onValueChange={(v) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartGrouping: v as ChartGrouping }; setGeneralSensors(u); }}>
                         <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="minute">Minute</SelectItem>
                           <SelectItem value="hour">Hour</SelectItem>
                           <SelectItem value="day">Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-muted-foreground">Aggregation</Label>
                        <Select value={gs.chartAggregation || "average"} onValueChange={(v) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartAggregation: v as ChartAggregation }; setGeneralSensors(u); }}>
                          <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="max">Max</SelectItem>
                            <SelectItem value="min">Min</SelectItem>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="last">Last</SelectItem>
                            <SelectItem value="delta">Delta (change)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                   </div>

                  {/* Icon Size & Font Sizes */}
                  <div className="flex gap-2 flex-wrap">
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Icon Size</Label>
                      <Input type="number" min={12} max={64} value={gs.iconSize || 20} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], iconSize: Number(e.target.value) }; setGeneralSensors(u); }} className="mt-1 bg-muted border-border text-xs h-8" />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Value px</Label>
                      <Input type="number" min={8} max={48} value={gs.fontSize?.value || ""} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], fontSize: { ...u[gsIdx].fontSize, value: Number(e.target.value) || undefined } }; setGeneralSensors(u); }} placeholder="18" className="mt-1 bg-muted border-border text-xs h-8" />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Body px</Label>
                      <Input type="number" min={8} max={48} value={gs.fontSize?.body || ""} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], fontSize: { ...u[gsIdx].fontSize, body: Number(e.target.value) || undefined } }; setGeneralSensors(u); }} placeholder="14" className="mt-1 bg-muted border-border text-xs h-8" />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Label px</Label>
                      <Input type="number" min={8} max={48} value={gs.fontSize?.label || ""} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], fontSize: { ...u[gsIdx].fontSize, label: Number(e.target.value) || undefined } }; setGeneralSensors(u); }} placeholder="10" className="mt-1 bg-muted border-border text-xs h-8" />
                    </div>
                  </div>

                  {/* Top Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Top Info (up to 4 sensors)</Label>
                      {gs.topInfo.length < 4 && (
                        <Button variant="ghost" size="sm" className="h-5 text-[12px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], topInfo: [...u[gsIdx].topInfo, { entityId: "", label: "", unit: "", color: "hsl(var(--foreground))" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                    {gs.topInfo.map((ti, tiIdx) => (
                      <div key={tiIdx} className="space-y-1.5 rounded border border-border/30 bg-background/30 p-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <EntityAutocomplete value={ti.entityId} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-8" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], topInfo: u[gsIdx].topInfo.filter((_, j) => j !== tiIdx) }; setGeneralSensors(u); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2 items-end">
                          <Input value={ti.label} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} placeholder="Label" className="flex-1 bg-muted border-border text-xs h-8" />
                          <Input value={ti.unit} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], unit: e.target.value }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} placeholder="Unit" className="w-20 bg-muted border-border text-xs h-8" />
                          <ColorPicker value={ti.color} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], color: val }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} className="w-36" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart Series */}
                  {gs.showGraph && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Chart Series</Label>
                        <Button variant="ghost" size="sm" className="h-5 text-[12px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartSeries: [...u[gsIdx].chartSeries, { entityId: "", label: "", color: "hsl(174, 72%, 50%)", chartType: "line" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      </div>
                      {gs.chartSeries.map((cs, csIdx) => (
                        <div key={csIdx} className="space-y-1.5 rounded border border-border/30 bg-background/30 p-2">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <EntityAutocomplete value={cs.entityId} onChange={(val) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-8" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartSeries: u[gsIdx].chartSeries.filter((_, j) => j !== csIdx) }; setGeneralSensors(u); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex gap-2 items-end">
                            <Input value={cs.label} onChange={(e) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} placeholder="Label" className="flex-1 bg-muted border-border text-xs h-8" />
                            <Select value={cs.chartType} onValueChange={(v) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], chartType: v as SensorChartType }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }}>
                              <SelectTrigger className="w-24 h-8 bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="area">Area</SelectItem>
                                <SelectItem value="step">Step</SelectItem>
                                <SelectItem value="scatter">Scatter</SelectItem>
                              </SelectContent>
                            </Select>
                            <ColorPicker value={cs.color} onChange={(val) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], color: val }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} className="w-36" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Bottom Info (up to 4 sensors)</Label>
                      {gs.bottomInfo.length < 4 && (
                        <Button variant="ghost" size="sm" className="h-5 text-[12px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], bottomInfo: [...u[gsIdx].bottomInfo, { entityId: "", label: "", unit: "", color: "hsl(var(--foreground))" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                    {gs.bottomInfo.map((bi, biIdx) => (
                      <div key={biIdx} className="space-y-1.5 rounded border border-border/30 bg-background/30 p-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <EntityAutocomplete value={bi.entityId} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-8" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], bottomInfo: u[gsIdx].bottomInfo.filter((_, j) => j !== biIdx) }; setGeneralSensors(u); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2 items-end">
                          <Input value={bi.label} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} placeholder="Label" className="flex-1 bg-muted border-border text-xs h-8" />
                          <Input value={bi.unit} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], unit: e.target.value }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} placeholder="Unit" className="w-20 bg-muted border-border text-xs h-8" />
                          <ColorPicker value={bi.color} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], color: val }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} className="w-36" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleSection>

            {/* Sensor Grids */}
            <CollapsibleSection
              title="Sensor Grids"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const id = `sg_${Date.now()}`;
                    setSensorGrids([...sensorGrids, {
                      id, label: "", rows: 2, columns: 2,
                      cells: Array.from({ length: 4 }, () => ({
                        entityId: "", label: "", icon: "circle", unit: "", color: "hsl(var(--foreground))",
                        useIntervals: false,
                        intervals: [
                          { min: 0, max: 25, icon: "circle", color: "hsl(120, 70%, 45%)" },
                          { min: 25, max: 50, icon: "circle", color: "hsl(60, 70%, 50%)" },
                          { min: 50, max: 75, icon: "circle", color: "hsl(30, 90%, 50%)" },
                          { min: 75, max: 100, icon: "circle", color: "hsl(0, 70%, 50%)" },
                        ],
                        valueMaps: [],
                      })),
                    }]);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {sensorGrids.map((sg, sgIdx) => (
                <div key={sg.id} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sensor Grid {sgIdx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setSensorGrids(sensorGrids.filter((_, j) => j !== sgIdx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input value={sg.label} onChange={(e) => { const u = [...sensorGrids]; u[sgIdx] = { ...u[sgIdx], label: e.target.value }; setSensorGrids(u); }} placeholder="Sensor Grid" className="mt-1 bg-muted border-border text-sm" />
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Rows</Label>
                      <Select value={String(sg.rows)} onValueChange={(v) => {
                        const newRows = Number(v);
                        const u = [...sensorGrids];
                        const totalCells = newRows * sg.columns;
                        const cells = [...sg.cells];
                        while (cells.length < totalCells) cells.push({
                          entityId: "", label: "", icon: "circle", unit: "", color: "hsl(var(--foreground))",
                          useIntervals: false,
                          intervals: [
                            { min: 0, max: 25, icon: "circle", color: "hsl(120, 70%, 45%)" },
                            { min: 25, max: 50, icon: "circle", color: "hsl(60, 70%, 50%)" },
                            { min: 50, max: 75, icon: "circle", color: "hsl(30, 90%, 50%)" },
                            { min: 75, max: 100, icon: "circle", color: "hsl(0, 70%, 50%)" },
                          ],
                          valueMaps: [],
                        });
                        u[sgIdx] = { ...u[sgIdx], rows: newRows, cells: cells.slice(0, totalCells) };
                        setSensorGrids(u);
                      }}>
                        <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 6 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Columns</Label>
                      <Select value={String(sg.columns)} onValueChange={(v) => {
                        const newCols = Number(v);
                        const u = [...sensorGrids];
                        const totalCells = sg.rows * newCols;
                        const cells = [...sg.cells];
                        while (cells.length < totalCells) cells.push({
                          entityId: "", label: "", icon: "circle", unit: "", color: "hsl(var(--foreground))",
                          useIntervals: false,
                          intervals: [
                            { min: 0, max: 25, icon: "circle", color: "hsl(120, 70%, 45%)" },
                            { min: 25, max: 50, icon: "circle", color: "hsl(60, 70%, 50%)" },
                            { min: 50, max: 75, icon: "circle", color: "hsl(30, 90%, 50%)" },
                            { min: 75, max: 100, icon: "circle", color: "hsl(0, 70%, 50%)" },
                          ],
                          valueMaps: [],
                        });
                        u[sgIdx] = { ...u[sgIdx], columns: newCols, cells: cells.slice(0, totalCells) };
                        setSensorGrids(u);
                      }}>
                        <SelectTrigger className="mt-1 bg-muted border-border text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 6 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cells */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cells ({sg.rows} × {sg.columns})</Label>
                    {sg.cells.map((cell, cIdx) => {
                      const updateCell = (patch: Partial<SensorGridCellConfig>) => {
                        const u = [...sensorGrids];
                        const cells = [...u[sgIdx].cells];
                        cells[cIdx] = { ...cells[cIdx], ...patch };
                        u[sgIdx] = { ...u[sgIdx], cells };
                        setSensorGrids(u);
                      };
                      return (
                      <div key={cIdx} className="space-y-1.5 rounded border border-border/30 bg-background/30 p-2">
                        <div className="flex gap-2 items-end">
                          <span className="text-[12px] text-muted-foreground w-4 shrink-0">{cIdx + 1}</span>
                          <div className="flex-1">
                            <EntityAutocomplete value={cell.entityId} onChange={(val) => updateCell({ entityId: val })} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-8" />
                          </div>
                        </div>
                        <div className="flex gap-2 items-end pl-5">
                          <Input value={cell.label} onChange={(e) => updateCell({ label: e.target.value })} placeholder="Label" className="flex-1 bg-muted border-border text-xs h-8" />
                          <IconPicker value={cell.icon} onChange={(val) => updateCell({ icon: val })} placeholder="mdi:icon" className="w-28 bg-muted border-border text-xs h-8" />
                          <Input value={cell.unit} onChange={(e) => updateCell({ unit: e.target.value })} placeholder="Unit" className="w-16 bg-muted border-border text-xs h-8" />
                          <div className="flex flex-col gap-0.5">
                            <Label className="text-[10px] text-muted-foreground">Icon</Label>
                            <ColorPicker value={cell.color} onChange={(val) => updateCell({ color: val })} className="w-36" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <Label className="text-[10px] text-muted-foreground">Value</Label>
                            <ColorPicker value={cell.valueColor || cell.color} onChange={(val) => updateCell({ valueColor: val })} className="w-36" />
                          </div>
                        </div>
                        <div className="flex gap-2 items-end pl-5 flex-wrap">
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Icon px</Label>
                            <Input type="number" min={8} max={64} value={cell.iconSize || ""} onChange={(e) => updateCell({ iconSize: Number(e.target.value) || undefined })} placeholder="16" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Value px</Label>
                            <Input type="number" min={8} max={48} value={cell.fontSize || ""} onChange={(e) => updateCell({ fontSize: Number(e.target.value) || undefined })} placeholder="14" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Label px</Label>
                            <Input type="number" min={8} max={48} value={cell.labelFontSize || ""} onChange={(e) => updateCell({ labelFontSize: Number(e.target.value) || undefined })} placeholder="10" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Col span</Label>
                            <Input type="number" min={1} max={6} value={cell.colSpan || ""} onChange={(e) => updateCell({ colSpan: Number(e.target.value) || undefined })} placeholder="1" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Row span</Label>
                            <Input type="number" min={1} max={6} value={cell.rowSpan || ""} onChange={(e) => updateCell({ rowSpan: Number(e.target.value) || undefined })} placeholder="1" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[12px] text-muted-foreground">Order</Label>
                            <Input type="number" min={0} max={99} value={cell.order ?? ""} onChange={(e) => updateCell({ order: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={String(cIdx)} className="bg-muted border-border text-xs h-7" />
                          </div>
                        </div>
                        <div className="flex gap-2 items-center pl-5">
                          <Checkbox
                            checked={cell.showChart || false}
                            onCheckedChange={(checked) => updateCell({ showChart: !!checked })}
                            className="h-3 w-3"
                          />
                          <span className="text-[12px] text-muted-foreground">Background chart (24h)</span>
                          {cell.showChart && (
                            <Select value={cell.chartType || "line"} onValueChange={(v) => updateCell({ chartType: v as any })}>
                              <SelectTrigger className="w-24 bg-muted border-border text-xs h-6"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="area">Area</SelectItem>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="step">Step</SelectItem>
                                <SelectItem value="scatter">Scatter</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Value Mapping */}
                        <div className="pl-5 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-muted-foreground">Value Mapping</span>
                            <Button variant="ghost" size="sm" className="h-5 text-[12px] px-1 text-primary" onClick={() => {
                              updateCell({ valueMaps: [...(cell.valueMaps || []), { from: "", to: "" }] });
                            }}>+ Add</Button>
                          </div>
                          {(cell.valueMaps || []).map((vm, vmIdx) => (
                            <div key={vmIdx} className="space-y-1 rounded border border-border/20 p-1.5">
                              <div className="flex gap-1 items-center">
                                <Input value={vm.from} onChange={(e) => {
                                  const maps = [...(cell.valueMaps || [])];
                                  maps[vmIdx] = { ...maps[vmIdx], from: e.target.value };
                                  updateCell({ valueMaps: maps });
                                }} placeholder="From" className="w-32 bg-muted border-border text-xs h-7" />
                                <span className="text-[12px] text-muted-foreground">→</span>
                                <Input value={vm.to} onChange={(e) => {
                                  const maps = [...(cell.valueMaps || [])];
                                  maps[vmIdx] = { ...maps[vmIdx], to: e.target.value };
                                  updateCell({ valueMaps: maps });
                                }} placeholder="To" className="w-32 bg-muted border-border text-xs h-7" />
                                <IconPicker value={vm.icon || ""} onChange={(val) => {
                                  const maps = [...(cell.valueMaps || [])];
                                  maps[vmIdx] = { ...maps[vmIdx], icon: val || undefined };
                                  updateCell({ valueMaps: maps });
                                }} placeholder="Icon" className="w-24 bg-muted border-border text-xs h-7" />
                                <ColorPicker value={vm.color || ""} onChange={(val) => {
                                  const maps = [...(cell.valueMaps || [])];
                                  maps[vmIdx] = { ...maps[vmIdx], color: val || undefined };
                                  updateCell({ valueMaps: maps });
                                }} className="w-28" />
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {
                                  updateCell({ valueMaps: (cell.valueMaps || []).filter((_, j) => j !== vmIdx) });
                                }}><Trash2 className="h-2.5 w-2.5" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Conditional Intervals */}
                        <div className="pl-5 space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={cell.useIntervals || false}
                              onCheckedChange={(checked) => {
                                updateCell({
                                  useIntervals: !!checked,
                                  intervals: cell.intervals?.length ? cell.intervals : [
                                    { min: 0, max: 25, icon: "circle", color: "hsl(120, 70%, 45%)" },
                                    { min: 25, max: 50, icon: "circle", color: "hsl(60, 70%, 50%)" },
                                    { min: 50, max: 75, icon: "circle", color: "hsl(30, 90%, 50%)" },
                                    { min: 75, max: 100, icon: "circle", color: "hsl(0, 70%, 50%)" },
                                  ],
                                });
                              }}
                              className="h-3 w-3"
                            />
                            <span className="text-[12px] text-muted-foreground">Conditional icon/color (4 intervals)</span>
                          </div>
                          {cell.useIntervals && (cell.intervals || []).map((iv, ivIdx) => (
                            <div key={ivIdx} className="flex gap-1 items-center">
                              <span className="text-[11px] text-muted-foreground w-3">{ivIdx + 1}</span>
                              <Input value={iv.min} onChange={(e) => {
                                const intervals = [...(cell.intervals || [])];
                                intervals[ivIdx] = { ...intervals[ivIdx], min: Number(e.target.value) || 0 };
                                updateCell({ intervals });
                              }} type="number" placeholder="Min" className="w-20 bg-muted border-border text-xs h-7" />
                              <Input value={iv.max} onChange={(e) => {
                                const intervals = [...(cell.intervals || [])];
                                intervals[ivIdx] = { ...intervals[ivIdx], max: Number(e.target.value) || 0 };
                                updateCell({ intervals });
                              }} type="number" placeholder="Max" className="w-20 bg-muted border-border text-xs h-7" />
                              <IconPicker value={iv.icon} onChange={(val) => {
                                const intervals = [...(cell.intervals || [])];
                                intervals[ivIdx] = { ...intervals[ivIdx], icon: val };
                                updateCell({ intervals });
                              }} placeholder="mdi:icon" className="w-24 bg-muted border-border text-xs h-6" />
                              <ColorPicker value={iv.color} onChange={(val) => {
                                const intervals = [...(cell.intervals || [])];
                                intervals[ivIdx] = { ...intervals[ivIdx], color: val };
                                updateCell({ intervals });
                              }} className="w-28" />
                            </div>
                          ))}
                        </div>

                        {/* Visibility Filter */}
                        <div className="pl-5 space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={cell.visibilityFilter?.enabled || false}
                              onCheckedChange={(checked) => {
                                updateCell({
                                  visibilityFilter: {
                                    ...(cell.visibilityFilter || { enabled: false, mode: "exact", exactValues: [] }),
                                    enabled: !!checked,
                                  },
                                });
                              }}
                              className="h-3 w-3"
                            />
                            <span className="text-[12px] text-muted-foreground">Only show when state matches</span>
                          </div>
                          {cell.visibilityFilter?.enabled && (
                            <div className="space-y-1.5 pl-1">
                              <div className="flex gap-2 items-center">
                                <Label className="text-[11px] text-muted-foreground w-10">Mode</Label>
                                <Select
                                  value={cell.visibilityFilter.mode || "exact"}
                                  onValueChange={(v) => updateCell({
                                    visibilityFilter: { ...cell.visibilityFilter!, mode: v as "range" | "exact" },
                                  })}
                                >
                                  <SelectTrigger className="w-32 bg-muted border-border text-xs h-7"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="exact">Exact values</SelectItem>
                                    <SelectItem value="range">Number range</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {cell.visibilityFilter.mode === "range" ? (
                                <div className="flex gap-2 items-center">
                                  <Label className="text-[11px] text-muted-foreground w-10">Min</Label>
                                  <Input
                                    type="number"
                                    value={cell.visibilityFilter.rangeMin ?? ""}
                                    onChange={(e) => updateCell({
                                      visibilityFilter: { ...cell.visibilityFilter!, rangeMin: e.target.value === "" ? undefined : Number(e.target.value) },
                                    })}
                                    placeholder="−∞"
                                    className="w-20 bg-muted border-border text-xs h-7"
                                  />
                                  <Label className="text-[11px] text-muted-foreground w-10">Max</Label>
                                  <Input
                                    type="number"
                                    value={cell.visibilityFilter.rangeMax ?? ""}
                                    onChange={(e) => updateCell({
                                      visibilityFilter: { ...cell.visibilityFilter!, rangeMax: e.target.value === "" ? undefined : Number(e.target.value) },
                                    })}
                                    placeholder="∞"
                                    className="w-20 bg-muted border-border text-xs h-7"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-[11px] text-muted-foreground">Show when value is any of:</Label>
                                    <Button variant="ghost" size="sm" className="h-5 text-[11px] px-1 text-primary" onClick={() => {
                                      updateCell({
                                        visibilityFilter: {
                                          ...cell.visibilityFilter!,
                                          exactValues: [...(cell.visibilityFilter!.exactValues || []), ""],
                                        },
                                      });
                                    }}>+ Add</Button>
                                  </div>
                                  {(cell.visibilityFilter.exactValues || []).map((val, evIdx) => (
                                    <div key={evIdx} className="flex gap-1 items-center">
                                      <Input
                                        value={val}
                                        onChange={(e) => {
                                          const vals = [...(cell.visibilityFilter!.exactValues || [])];
                                          vals[evIdx] = e.target.value;
                                          updateCell({ visibilityFilter: { ...cell.visibilityFilter!, exactValues: vals } });
                                        }}
                                        placeholder="e.g. on, home, open"
                                        className="w-48 bg-muted border-border text-xs h-7"
                                      />
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {
                                        updateCell({
                                          visibilityFilter: {
                                            ...cell.visibilityFilter!,
                                            exactValues: (cell.visibilityFilter!.exactValues || []).filter((_, j) => j !== evIdx),
                                          },
                                        });
                                      }}><Trash2 className="h-2.5 w-2.5" /></Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CollapsibleSection>

            {/* RSS News Feeds */}
            <CollapsibleSection
              title="RSS News Feeds"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const id = `rss_${Date.now()}`;
                    setRssFeeds([...rssFeeds, { id, label: "News", feedUrl: "", maxItems: 15 }]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Feed
                </Button>
              }
            >
              {rssFeeds.map((feed, idx) => (
                <div key={feed.id} className="space-y-2 border border-border/50 rounded-lg p-3 relative">
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-6 w-6" onClick={() => setRssFeeds(rssFeeds.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div>
                    <Label className="text-xs text-muted-foreground">Label</Label>
                    <Input
                      value={feed.label}
                      onChange={(e) => setRssFeeds(rssFeeds.map((f, i) => i === idx ? { ...f, label: e.target.value } : f))}
                      className="mt-1 bg-muted border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Feed URL</Label>
                    <Input
                      value={feed.feedUrl}
                      onChange={(e) => setRssFeeds(rssFeeds.map((f, i) => i === idx ? { ...f, feedUrl: e.target.value } : f))}
                      placeholder="https://example.com/rss.xml"
                      className="mt-1 bg-muted border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Max Items</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={feed.maxItems}
                      onChange={(e) => setRssFeeds(rssFeeds.map((f, i) => i === idx ? { ...f, maxItems: Number(e.target.value) || 15 } : f))}
                      className="mt-1 bg-muted border-border"
                    />
                  </div>
                </div>
              ))}
              <WidgetStyleControls
                style={getStyle("rss")}
                onChange={(s) => setStyle("rss", s)}
                fields={["labelColor", "valueColor", "headingColor"]}
              />
            </CollapsibleSection>

            {/* Notifications & Alerts */}
            <CollapsibleSection
              title="Notifications & Alerts"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const id = `alert_${Date.now()}`;
                    setNotificationConfig((prev) => ({
                      ...prev,
                      alertRules: [...(prev.alertRules || []), { id, entityId: "", label: "", condition: "above" as const, threshold: 0, icon: "alert-triangle", color: "hsl(0, 72%, 55%)" }],
                    }));
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Alert
                </Button>
              }
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={notificationConfig.showHANotifications}
                  onCheckedChange={(v) => setNotificationConfig((prev) => ({ ...prev, showHANotifications: v }))}
                />
                <Label className="text-xs text-muted-foreground">Show HA Persistent Notifications</Label>
              </div>

              {(notificationConfig.alertRules || []).map((rule, idx) => (
                <div key={rule.id} className="space-y-2 border border-border/50 rounded-lg p-3 relative">
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-6 w-6" onClick={() => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.filter((_, i) => i !== idx) }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div>
                    <Label className="text-xs text-muted-foreground">Label</Label>
                    <Input
                      value={rule.label}
                      onChange={(e) => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.map((r, i) => i === idx ? { ...r, label: e.target.value } : r) }))}
                      placeholder="High temperature"
                      className="mt-1 bg-muted border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entity ID</Label>
                    <EntityAutocomplete
                      value={rule.entityId}
                      onChange={(v) => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.map((r, i) => i === idx ? { ...r, entityId: v } : r) }))}
                      config={config}
                      domainFilter="sensor"
                      placeholder="sensor.temperature"
                      className="mt-1 bg-muted border-border text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Condition</Label>
                      <Select
                        value={rule.condition}
                        onValueChange={(v) => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.map((r, i) => i === idx ? { ...r, condition: v as "above" | "below" | "equals" } : r) }))}
                      >
                        <SelectTrigger className="mt-1 bg-muted border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Threshold</Label>
                      <Input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.map((r, i) => i === idx ? { ...r, threshold: Number(e.target.value) } : r) }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Alert Color</Label>
                    <ColorPicker
                      value={rule.color}
                      onChange={(v) => setNotificationConfig((prev) => ({ ...prev, alertRules: prev.alertRules.map((r, i) => i === idx ? { ...r, color: v } : r) }))}
                    />
                  </div>
                </div>
              ))}
              <WidgetStyleControls
                style={getStyle("notifications")}
                onChange={(s) => setStyle("notifications", s)}
                fields={["iconSize", "iconColor", "labelColor", "valueColor", "headingColor"]}
              />
            </CollapsibleSection>

            {/* Vehicles */}
            <CollapsibleSection
              title="Vehicles"
              actions={
                <Button variant="ghost" size="sm" onClick={() => {
                  const id = `vehicle_${Date.now()}`;
                  setVehicles((prev) => [...prev, {
                    id,
                    name: "My Vehicle",
                    icon: "mdi:car",
                    sections: [
                      { id: `${id}_battery`, type: "battery" as const, label: "Battery", entities: [] },
                    ],
                  }]);
                }} className="text-primary">
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              }
            >
              {vehicles.map((vc, vcIdx) => (
                <div key={vc.id} className="space-y-3 border border-border/50 rounded-lg p-3 relative">
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-6 w-6" onClick={() => setVehicles((prev) => prev.filter((_, i) => i !== vcIdx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input value={vc.name} onChange={(e) => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, name: e.target.value } : v))} className="mt-1 bg-muted border-border" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Icon (mdi:*)</Label>
                      <Input value={vc.icon} onChange={(e) => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, icon: e.target.value } : v))} placeholder="mdi:car-electric" className="mt-1 bg-muted border-border" />
                    </div>
                  </div>

                  {/* Sections */}
                  {vc.sections.map((section, sIdx) => (
                    <div key={section.id} className="space-y-2 border border-border/30 rounded p-2 relative">
                      <Button variant="ghost" size="icon" className="absolute right-0.5 top-0.5 h-5 w-5" onClick={() => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, sections: v.sections.filter((_, si) => si !== sIdx) } : v))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Section Label</Label>
                          <Input value={section.label} onChange={(e) => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, sections: v.sections.map((s, si) => si === sIdx ? { ...s, label: e.target.value } : s) } : v))} className="mt-1 bg-muted border-border text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <Select value={section.type} onValueChange={(val) => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, sections: v.sections.map((s, si) => si === sIdx ? { ...s, type: val as any } : s) } : v))}>
                            <SelectTrigger className="mt-1 bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="battery">Battery</SelectItem>
                              <SelectItem value="fuel">Fuel</SelectItem>
                              <SelectItem value="location">Location</SelectItem>
                              <SelectItem value="climate">Climate</SelectItem>
                              <SelectItem value="doors">Doors / Locks</SelectItem>
                              <SelectItem value="tires">Tires</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Entities in section */}
                      {section.entities.map((ent, eIdx) => (
                        <div key={eIdx} className="grid grid-cols-[1fr_1fr_80px_60px_auto] gap-1 items-end">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Entity</Label>
                            <EntityAutocomplete value={ent.entityId} onChange={(v) => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: s.entities.map((e2, ei) => ei === eIdx ? { ...e2, entityId: v } : e2) } : s) } : vc2))} config={config} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Label</Label>
                            <Input value={ent.label} onChange={(e) => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: s.entities.map((e2, ei) => ei === eIdx ? { ...e2, label: e.target.value } : e2) } : s) } : vc2))} className="bg-muted border-border text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Icon</Label>
                            <Input value={ent.icon} onChange={(e) => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: s.entities.map((e2, ei) => ei === eIdx ? { ...e2, icon: e.target.value } : e2) } : s) } : vc2))} placeholder="mdi:battery" className="bg-muted border-border text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Unit</Label>
                            <Input value={ent.unit} onChange={(e) => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: s.entities.map((e2, ei) => ei === eIdx ? { ...e2, unit: e.target.value } : e2) } : s) } : vc2))} className="bg-muted border-border text-xs" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: s.entities.filter((_, ei) => ei !== eIdx) } : s) } : vc2))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setVehicles((prev) => prev.map((vc2, i) => i === vcIdx ? { ...vc2, sections: vc2.sections.map((s, si) => si === sIdx ? { ...s, entities: [...s.entities, { entityId: "", label: "", icon: "mdi:information", unit: "", color: "hsl(174, 72%, 50%)" }] } : s) } : vc2))}>
                        <Plus className="mr-1 h-3 w-3" /> Add Entity
                      </Button>
                    </div>
                  ))}

                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setVehicles((prev) => prev.map((v, i) => i === vcIdx ? { ...v, sections: [...v.sections, { id: `${v.id}_s${Date.now()}`, type: "custom" as const, label: "Section", entities: [] }] } : v))}>
                    <Plus className="mr-1 h-3 w-3" /> Add Section
                  </Button>
                </div>
              ))}
              <WidgetStyleControls
                style={getStyle("vehicle")}
                onChange={(s) => setStyle("vehicle", s)}
                fields={["iconSize", "iconColor", "labelColor", "valueColor"]}
              />
            </CollapsibleSection>

          </TabsContent>

          {/* ===== PHOTOS TAB ===== */}
          <TabsContent value="photos" className="space-y-6 mt-0">
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Photo Gallery</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Rotation Interval (seconds)</Label>
                <Input
                  value={photoConfig.intervalSeconds}
                  onChange={(e) => setPhotoConfig((prev) => ({ ...prev, intervalSeconds: Number(e.target.value) || 10 }))}
                  type="number" min={1}
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Display Mode</Label>
                <Select
                  value={photoConfig.displayMode || "contain"}
                  onValueChange={(v) => setPhotoConfig((prev) => ({ ...prev, displayMode: v as "contain" | "cover" | "blur-fill" }))}
                >
                  <SelectTrigger className="mt-1 bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain (full image, may letterbox)</SelectItem>
                    <SelectItem value="cover">Cover (fill frame, may crop)</SelectItem>
                    <SelectItem value="blur-fill">Blur fill (full image, blurred bg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PhotoManager />
            </section>

          </TabsContent>

          {/* ===== LAYOUT TAB ===== */}
          <TabsContent value="layout" className="space-y-6 mt-0">
            {/* Global Font Sizes */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Text Sizes (px)</h3>
              <p className="text-xs text-muted-foreground">Global defaults. Per-widget overrides below.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Heading</Label>
                  <Input type="number" min={6} max={60} value={globalFontSizes.heading} onChange={(e) => setGlobalFontSizes((p) => ({ ...p, heading: Number(e.target.value) || 12 }))} className="mt-1 bg-muted border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input type="number" min={6} max={80} value={globalFontSizes.value} onChange={(e) => setGlobalFontSizes((p) => ({ ...p, value: Number(e.target.value) || 18 }))} className="mt-1 bg-muted border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Body</Label>
                  <Input type="number" min={6} max={60} value={globalFontSizes.body} onChange={(e) => setGlobalFontSizes((p) => ({ ...p, body: Number(e.target.value) || 14 }))} className="mt-1 bg-muted border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input type="number" min={6} max={40} value={globalFontSizes.label} onChange={(e) => setGlobalFontSizes((p) => ({ ...p, label: Number(e.target.value) || 10 }))} className="mt-1 bg-muted border-border" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Grid</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Grid Columns</Label>
                <Select value={String(gridColumns)} onValueChange={(v) => setGridColumns(Number(v))}>
                  <SelectTrigger className="mt-1 bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} column{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Per-row column overrides */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Columns per Row (override)</Label>
                {(() => {
                  const usedRows = new Set<number>();
                  widgetItems.forEach(({ id }) => {
                    const defaultRow = id === "electricity" || id === "calendar" ? 2 : 1;
                    usedRows.add(widgetLayouts[id]?.row || defaultRow);
                  });
                  const sortedRows = [...usedRows].sort((a, b) => a - b);
                  return sortedRows.map((row) => (
                    <div key={row} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14">Row {row}</span>
                      <Select
                        value={String(rowColumns[row] || gridColumns)}
                        onValueChange={(v) => {
                          const val = Number(v);
                          setRowColumns((prev) => {
                            const next = { ...prev };
                            if (val === gridColumns) delete next[row];
                            else next[row] = val;
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="flex-1 h-7 bg-muted border-border text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} col{n > 1 ? "s" : ""}{n === gridColumns ? " (default)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ));
                })()}
              </div>

            </section>

            {/* Widget Order */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Widget Order & Sizing</h3>
              <p className="text-xs text-muted-foreground">
                Drag to reorder widgets. Set column span per widget.
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widgetItems.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {widgetItems.map(({ id, label, defaultSpan }) => {
                      const defaultRow = id === "electricity" || id === "calendar" ? 2 : 1;
                      return (
                        <SortableWidgetItem
                          key={id}
                          id={id}
                          label={label}
                          colSpan={getColSpan(id, defaultSpan)}
                          row={getRow(id, defaultRow)}
                          rowSpan={getRowSpan(id, 1)}
                          widgetGroup={widgetLayouts[id]?.widgetGroup || ""}
                          maxCols={gridColumns}
                          fontSizes={widgetFontSizes[id] || {}}
                          onColSpanChange={(span) => updateLayout(id, { colSpan: span })}
                          onRowChange={(row) => updateLayout(id, { row })}
                          onRowSpanChange={(rowSpan) => updateLayout(id, { rowSpan })}
                          onWidgetGroupChange={(group) => updateLayout(id, { widgetGroup: group === "none" ? "" : group })}
                          onFontSizeChange={(sizes) => setWidgetFontSizes((prev) => ({ ...prev, [id]: sizes }))}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

          </TabsContent>
        </Tabs>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border p-4">
          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
