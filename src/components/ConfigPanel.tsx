import { useState, useMemo, useRef, useCallback } from "react";
import { Settings, X, Plus, Trash2, Save, GripVertical, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import type { DashboardConfig, TemperatureEntityConfig, WidgetLayout, PhotoWidgetConfig, PersonEntityConfig, CalendarEntityConfig, WeatherConfig, ThemeId, CarConfig, EnergyUsageConfig, FoodMenuConfig, GeneralSensorConfig, SensorChartType, SensorInfoItem, SensorChartSeries, ChartGrouping } from "@/lib/config";
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
  onColSpanChange: (span: number) => void;
  onRowChange: (row: number) => void;
  onRowSpanChange: (span: number) => void;
  onWidgetGroupChange: (group: string) => void;
}

const WIDGET_GROUPS = ["", "A", "B", "C", "D", "E", "F", "G", "H"];

function SortableWidgetItem({ id, label, colSpan, row, rowSpan, widgetGroup, maxCols, onColSpanChange, onRowChange, onRowSpanChange, onWidgetGroupChange }: SortableWidgetItemProps) {
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
        <Label className="text-[10px] text-muted-foreground">Grp</Label>
        <Select value={widgetGroup} onValueChange={onWidgetGroupChange}>
          <SelectTrigger className="w-14 h-7 bg-muted border-border text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_GROUPS.map((g) => (
              <SelectItem key={g || "none"} value={g || "none"}>{g || "—"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-[10px] text-muted-foreground">Row</Label>
        <Select value={String(row)} onValueChange={(v) => onRowChange(Number(v))}>
          <SelectTrigger className="w-14 h-7 bg-muted border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-[10px] text-muted-foreground">Cols</Label>
        <Select value={String(colSpan)} onValueChange={(v) => onColSpanChange(Number(v))}>
          <SelectTrigger className="w-14 h-7 bg-muted border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxCols }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-[10px] text-muted-foreground">Rows</Label>
        <Select value={String(rowSpan)} onValueChange={(v) => onRowSpanChange(Number(v))}>
          <SelectTrigger className="w-14 h-7 bg-muted border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

function getDefaultWidgetIds(tempEntities: { group?: number }[], personCount: number, hasCar: boolean, hasEnergy: boolean, generalSensorIds: string[]): string[] {
  return [
    ...getTempGroupIds(tempEntities),
    ...Array.from({ length: personCount }, (_, i) => `person_${i}`),
    ...(hasCar ? ["car"] : []),
    "electricity",
    ...(hasEnergy ? ["monthly_energy", "power_usage"] : []),
    "calendar",
    "food_menu",
    "weather",
    "photos",
    ...generalSensorIds.map((id) => `general_${id}`),
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
  const [weatherConfig, setWeatherConfig] = useState<WeatherConfig>(
    config.weatherConfig || { entityId: "weather.home", forecastDays: 5, showPrecipitation: true, showSunrise: true, showSunset: true }
  );
  const [electricityEntity, setElectricityEntity] = useState(config.electricityPriceEntity);
  const [widgetLayouts, setWidgetLayouts] = useState<Record<string, WidgetLayout>>(config.widgetLayouts || {});
  const [gridColumns, setGridColumns] = useState(config.gridColumns || 4);
  const [rowColumns, setRowColumns] = useState<Record<number, number>>(config.rowColumns || {});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>(config.rowHeights || {});
  const [photoConfig, setPhotoConfig] = useState<PhotoWidgetConfig>(config.photoWidget || { photos: [], intervalSeconds: 10, displayMode: "contain" });
  const [personEntities, setPersonEntities] = useState<PersonEntityConfig[]>(config.personEntities || []);
  const [theme, setTheme] = useState<ThemeId>(config.theme || "midnight-teal");
  const [carConfig, setCarConfig] = useState<CarConfig>(config.carConfig || { chargerEntity: "", fuelRangeEntity: "", batteryEntity: "" });
  const [energyConfig, setEnergyConfig] = useState<EnergyUsageConfig>(config.energyUsageConfig || { monthlyCostEntity: "", monthlyConsumptionEntity: "", currentPowerEntity: "", maxPowerEntity: "" });
  const [foodMenuConfig, setFoodMenuConfig] = useState<FoodMenuConfig>(config.foodMenuConfig || { calendarEntity: "", days: 5 });
  const [generalSensors, setGeneralSensors] = useState<GeneralSensorConfig[]>(config.generalSensors || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const hasCar = !!(config.carConfig?.chargerEntity || config.carConfig?.fuelRangeEntity || config.carConfig?.batteryEntity);
    const hasEnergy = !!(config.energyUsageConfig?.monthlyCostEntity || config.energyUsageConfig?.currentPowerEntity);
    const gsIds = (config.generalSensors || []).map((s) => s.id);
    const defaults = getDefaultWidgetIds(config.temperatureEntities, (config.personEntities || []).length, hasCar, hasEnergy, gsIds);
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
      car: "Car / EV", food_menu: "Food Menu",
      monthly_energy: "Monthly Energy", power_usage: "Power Usage",
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

    const hasCar = !!(carConfig.chargerEntity || carConfig.fuelRangeEntity || carConfig.batteryEntity);
    const hasEnergy = !!(energyConfig.monthlyCostEntity || energyConfig.currentPowerEntity);
    const gsIds = generalSensors.map((s) => s.id);
    const defaults = getDefaultWidgetIds(tempEntities, personEntities.length, hasCar, hasEnergy, gsIds);
    const validSet = new Set(defaults);
    const currentValid = widgetOrder.filter((id) => validSet.has(id));
    const missing = defaults.filter((id) => !currentValid.includes(id));
    const finalOrder = [...currentValid, ...missing];

    return finalOrder.map((id) => ({
      id,
      label: labelMap[id] || id,
      defaultSpan: ["electricity", "calendar", "photos", "car", "monthly_energy", "power_usage", "food_menu"].includes(id) || id.startsWith("general_") ? 2 : 1,
    }));
  }, [widgetOrder, tempEntities, personEntities, carConfig, energyConfig, generalSensors]);

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
      electricityPriceEntity: electricityEntity,
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
      carConfig,
      energyUsageConfig: energyConfig,
      foodMenuConfig: foodMenuConfig,
      generalSensors,
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

  const [panelWidth, setPanelWidth] = useState(448);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { startX: e.clientX, startWidth: panelWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const diff = dragStartRef.current.startX - ev.clientX;
      const newW = Math.max(350, Math.min(900, dragStartRef.current.startWidth + diff));
      setPanelWidth(newW);
    };
    const onUp = () => {
      dragStartRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelWidth]);

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




  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="h-full w-2 cursor-col-resize flex items-center justify-center hover:bg-primary/20 transition-colors"
        style={{ marginRight: 0 }}
      >
        <div className="h-8 w-1 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="h-full overflow-y-auto border-l border-border bg-card p-6 shadow-2xl" style={{ width: panelWidth }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Dashboard Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

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

            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
          </TabsContent>

          {/* ===== WIDGETS TAB ===== */}
          <TabsContent value="widgets" className="space-y-6 mt-0">
            {/* Temperature Sensors */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
                  Temperature Sensors
                </h3>
                <Button variant="ghost" size="sm" onClick={addTempEntity} className="text-primary">
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
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
                    <Input
                      value={entity.color}
                      onChange={(e) => updateTempEntity(i, { color: e.target.value })}
                      placeholder="hsl(174, 72%, 50%)"
                      className="w-40 bg-muted border-border text-sm"
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
            </section>

            {/* Calendar */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Calendar</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarEntityConfigs([...calendarEntityConfigs, { entityId: "", prefix: "", color: "" }])}
                  className="text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
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
            </section>

            {/* Weather */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Weather</h3>
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
            </section>

            {/* Food Menu */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Food Menu</h3>
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
            </section>

            {/* Electricity */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Electricity Price</h3>
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
            </section>

            {/* Person Cards */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Person Cards</h3>
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
            </section>

            {/* Car / EV */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Car / EV</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Charger Status Entity</Label>
                <EntityAutocomplete value={carConfig.chargerEntity} onChange={(val) => setCarConfig((prev) => ({ ...prev, chargerEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.ehg4chqg_status" className="mt-1 bg-muted border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fuel Driving Range Entity</Label>
                <EntityAutocomplete value={carConfig.fuelRangeEntity} onChange={(val) => setCarConfig((prev) => ({ ...prev, fuelRangeEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.ceed_fuel_driving_range" className="mt-1 bg-muted border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">EV Battery Level Entity</Label>
                <EntityAutocomplete value={carConfig.batteryEntity} onChange={(val) => setCarConfig((prev) => ({ ...prev, batteryEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.ceed_ev_battery_level" className="mt-1 bg-muted border-border text-sm" />
              </div>
            </section>

            {/* Energy Usage */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Energy Usage</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Monthly Cost Entity</Label>
                <EntityAutocomplete value={energyConfig.monthlyCostEntity} onChange={(val) => setEnergyConfig((prev) => ({ ...prev, monthlyCostEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.berget_monthly_cost" className="mt-1 bg-muted border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Monthly Consumption Entity (kWh)</Label>
                <EntityAutocomplete value={energyConfig.monthlyConsumptionEntity} onChange={(val) => setEnergyConfig((prev) => ({ ...prev, monthlyConsumptionEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.berget_monthly_net_consumption" className="mt-1 bg-muted border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Current Power Entity (W)</Label>
                <EntityAutocomplete value={energyConfig.currentPowerEntity} onChange={(val) => setEnergyConfig((prev) => ({ ...prev, currentPowerEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.tibber_pulse_berget_power" className="mt-1 bg-muted border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Power Entity (W)</Label>
                <EntityAutocomplete value={energyConfig.maxPowerEntity} onChange={(val) => setEnergyConfig((prev) => ({ ...prev, maxPowerEntity: val }))} config={config} domainFilter="sensor" placeholder="sensor.tibber_pulse_berget_max_power" className="mt-1 bg-muted border-border text-sm" />
              </div>
            </section>

            {/* General Sensors */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wider text-primary">General Sensors</h3>
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
              </div>
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
                      <Label className="text-xs text-muted-foreground">Icon (lucide name)</Label>
                      <Input value={gs.icon} onChange={(e) => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], icon: e.target.value }; setGeneralSensors(u); }} placeholder="activity" className="mt-1 bg-muted border-border text-sm" />
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
                   </div>

                  {/* Top Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Top Info (up to 4 sensors)</Label>
                      {gs.topInfo.length < 4 && (
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], topInfo: [...u[gsIdx].topInfo, { entityId: "", label: "", unit: "", color: "hsl(var(--foreground))" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                    {gs.topInfo.map((ti, tiIdx) => (
                      <div key={tiIdx} className="flex gap-1.5 items-end">
                        <div className="flex-1">
                          <EntityAutocomplete value={ti.entityId} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-7" />
                        </div>
                        <Input value={ti.label} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} placeholder="Label" className="w-16 bg-muted border-border text-xs h-7" />
                        <Input value={ti.unit} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], unit: e.target.value }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} placeholder="Unit" className="w-12 bg-muted border-border text-xs h-7" />
                        <Input value={ti.color} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].topInfo]; info[tiIdx] = { ...info[tiIdx], color: e.target.value }; u[gsIdx] = { ...u[gsIdx], topInfo: info }; setGeneralSensors(u); }} placeholder="Color" className="w-20 bg-muted border-border text-xs h-7" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], topInfo: u[gsIdx].topInfo.filter((_, j) => j !== tiIdx) }; setGeneralSensors(u); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Chart Series */}
                  {gs.showGraph && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Chart Series</Label>
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartSeries: [...u[gsIdx].chartSeries, { entityId: "", label: "", color: "hsl(174, 72%, 50%)", chartType: "line" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      </div>
                      {gs.chartSeries.map((cs, csIdx) => (
                        <div key={csIdx} className="flex gap-1.5 items-end">
                          <div className="flex-1">
                            <EntityAutocomplete value={cs.entityId} onChange={(val) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-7" />
                          </div>
                          <Input value={cs.label} onChange={(e) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} placeholder="Label" className="w-16 bg-muted border-border text-xs h-7" />
                          <Select value={cs.chartType} onValueChange={(v) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], chartType: v as SensorChartType }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }}>
                            <SelectTrigger className="w-20 h-7 bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line">Line</SelectItem>
                              <SelectItem value="bar">Bar</SelectItem>
                              <SelectItem value="area">Area</SelectItem>
                              <SelectItem value="step">Step</SelectItem>
                              <SelectItem value="scatter">Scatter</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={cs.color} onChange={(e) => { const u = [...generalSensors]; const series = [...u[gsIdx].chartSeries]; series[csIdx] = { ...series[csIdx], color: e.target.value }; u[gsIdx] = { ...u[gsIdx], chartSeries: series }; setGeneralSensors(u); }} placeholder="Color" className="w-20 bg-muted border-border text-xs h-7" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], chartSeries: u[gsIdx].chartSeries.filter((_, j) => j !== csIdx) }; setGeneralSensors(u); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Bottom Info (up to 4 sensors)</Label>
                      {gs.bottomInfo.length < 4 && (
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] text-primary px-1" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], bottomInfo: [...u[gsIdx].bottomInfo, { entityId: "", label: "", unit: "", color: "hsl(var(--foreground))" }] }; setGeneralSensors(u); }}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                    {gs.bottomInfo.map((bi, biIdx) => (
                      <div key={biIdx} className="flex gap-1.5 items-end">
                        <div className="flex-1">
                          <EntityAutocomplete value={bi.entityId} onChange={(val) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], entityId: val }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} config={config} domainFilter="sensor" placeholder="sensor.x" className="bg-muted border-border text-xs h-7" />
                        </div>
                        <Input value={bi.label} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], label: e.target.value }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} placeholder="Label" className="w-16 bg-muted border-border text-xs h-7" />
                        <Input value={bi.unit} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], unit: e.target.value }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} placeholder="Unit" className="w-12 bg-muted border-border text-xs h-7" />
                        <Input value={bi.color} onChange={(e) => { const u = [...generalSensors]; const info = [...u[gsIdx].bottomInfo]; info[biIdx] = { ...info[biIdx], color: e.target.value }; u[gsIdx] = { ...u[gsIdx], bottomInfo: info }; setGeneralSensors(u); }} placeholder="Color" className="w-20 bg-muted border-border text-xs h-7" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => { const u = [...generalSensors]; u[gsIdx] = { ...u[gsIdx], bottomInfo: u[gsIdx].bottomInfo.filter((_, j) => j !== biIdx) }; setGeneralSensors(u); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>


            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
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
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        setPhotoConfig((prev) => ({ ...prev, photos: [...prev.photos, dataUrl] }));
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="mr-2 h-3 w-3" /> Upload Photos
                </Button>
              </div>
              {photoConfig.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoConfig.photos.map((photo, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-md border border-border/50">
                      <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        onClick={() => setPhotoConfig((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                        className="absolute right-1 top-1 rounded-full bg-destructive/80 p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Photos are stored as base64 in config. For many/large photos, use a config backend.
              </p>
            </section>

            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
          </TabsContent>

          {/* ===== LAYOUT TAB ===== */}
          <TabsContent value="layout" className="space-y-6 mt-0">
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
                        <SelectTrigger className="w-28 h-7 bg-muted border-border text-xs">
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

              {/* Per-row height overrides */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Height per Row (px)</Label>
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
                      <Input
                        type="number" min={50} max={1000} step={10} placeholder="auto"
                        value={rowHeights[row] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRowHeights((prev) => {
                            const next = { ...prev };
                            if (!val || val === "0") delete next[row];
                            else next[row] = Number(val);
                            return next;
                          });
                        }}
                        className="w-28 h-7 bg-muted border-border text-xs"
                      />
                      <span className="text-xs text-muted-foreground">px</span>
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
                          onColSpanChange={(span) => updateLayout(id, { colSpan: span })}
                          onRowChange={(row) => updateLayout(id, { row })}
                          onRowSpanChange={(rowSpan) => updateLayout(id, { rowSpan })}
                          onWidgetGroupChange={(group) => updateLayout(id, { widgetGroup: group === "none" ? "" : group })}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
