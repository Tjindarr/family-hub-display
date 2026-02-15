import { useState, useMemo, useRef } from "react";
import { Settings, X, Plus, Trash2, Save, GripVertical, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import type { DashboardConfig, TemperatureEntityConfig, WidgetLayout, PhotoWidgetConfig, PersonEntityConfig, CalendarEntityConfig, WeatherConfig } from "@/lib/config";
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
  maxCols: number;
  onColSpanChange: (span: number) => void;
  onRowChange: (row: number) => void;
  onRowSpanChange: (span: number) => void;
}

function SortableWidgetItem({ id, label, colSpan, row, rowSpan, maxCols, onColSpanChange, onRowChange, onRowSpanChange }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
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

function getDefaultWidgetIds(tempCount: number, personCount: number): string[] {
  return [
    "clock",
    ...Array.from({ length: tempCount }, (_, i) => `temp_${i}`),
    ...Array.from({ length: personCount }, (_, i) => `person_${i}`),
    "electricity",
    "calendar",
    "weather",
    "photos",
  ];
}

export default function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [haUrl, setHaUrl] = useState(config.haUrl);
  const [haToken, setHaToken] = useState(config.haToken);
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval);
  // configBackendUrl removed — config persistence is now built-in
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
  const [photoConfig, setPhotoConfig] = useState<PhotoWidgetConfig>(config.photoWidget || { photos: [], intervalSeconds: 10 });
  const [personEntities, setPersonEntities] = useState<PersonEntityConfig[]>(config.personEntities || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const defaults = getDefaultWidgetIds(config.temperatureEntities.length, (config.personEntities || []).length);
    if (config.widgetOrder && config.widgetOrder.length > 0) {
      const validSet = new Set(defaults);
      const ordered = config.widgetOrder.filter((id) => validSet.has(id));
      const missing = defaults.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    }
    return defaults;
  });

  // Rebuild widget order when temp entities change
  const widgetItems = useMemo(() => {
    const labelMap: Record<string, string> = { clock: "Clock", electricity: "Electricity Price", calendar: "Calendar", weather: "Weather", photos: "Photo Gallery" };
    tempEntities.forEach((e, i) => { labelMap[`temp_${i}`] = e.label || `Sensor ${i + 1}`; });
    personEntities.forEach((p, i) => { labelMap[`person_${i}`] = p.name || `Person ${i + 1}`; });

    const defaults = getDefaultWidgetIds(tempEntities.length, personEntities.length);
    const validSet = new Set(defaults);
    const currentValid = widgetOrder.filter((id) => validSet.has(id));
    const missing = defaults.filter((id) => !currentValid.includes(id));
    const finalOrder = [...currentValid, ...missing];

    return finalOrder.map((id) => ({
      id,
      label: labelMap[id] || id,
      defaultSpan: id === "electricity" || id === "calendar" || id === "photos" ? 2 : 1,
    }));
  }, [widgetOrder, tempEntities, personEntities]);

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
      configBackendUrl: "",
      photoWidget: photoConfig,
      personEntities,
      weatherConfig,
    });
    setOpen(false);
  };

  const addTempEntity = () => {
    const newIndex = tempEntities.length;
    setTempEntities([
      ...tempEntities,
      { entityId: "", label: "", color: "hsl(174, 72%, 50%)" },
    ]);
    setWidgetOrder((prev) => [...prev, `temp_${newIndex}`]);
  };

  const removeTempEntity = (index: number) => {
    setTempEntities(tempEntities.filter((_, i) => i !== index));
    setWidgetOrder((prev) => prev.filter((id) => id !== `temp_${index}`).map((id) => {
      if (id.startsWith("temp_")) {
        const idx = parseInt(id.split("_")[1], 10);
        if (idx > index) return `temp_${idx - 1}`;
      }
      return id;
    }));
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Dashboard Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* HA Connection */}
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

          {/* Config persistence is now built-in via /api/config */}

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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeTempEntity(i)}
                  >
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
              </div>
            ))}
          </section>

          {/* Calendar */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
                Calendar Entities
              </h3>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => setCalendarEntityConfigs(calendarEntityConfigs.filter((_, j) => j !== i))}
                    >
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
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Weather
            </h3>
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
                <input
                  type="checkbox"
                  checked={weatherConfig.showPrecipitation}
                  onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showPrecipitation: e.target.checked }))}
                  className="rounded border-border"
                />
                Show Precipitation
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={weatherConfig.showSunrise}
                  onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showSunrise: e.target.checked }))}
                  className="rounded border-border"
                />
                Show Sunrise
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={weatherConfig.showSunset}
                  onChange={(e) => setWeatherConfig((prev) => ({ ...prev, showSunset: e.target.checked }))}
                  className="rounded border-border"
                />
                Show Sunset
              </label>
            </div>
          </section>

          {/* Person Cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
                Person Cards
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPersonEntities([...personEntities, {
                    name: "",
                    entityPicture: "",
                    locationEntity: "",
                    batteryEntity: "",
                    batteryChargingEntity: "",
                    distanceEntity: "",
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
                  <EntityAutocomplete
                    value={person.entityPicture}
                    onChange={(val) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], entityPicture: val };
                      setPersonEntities(updated);
                    }}
                    config={config}
                    domainFilter="person"
                    placeholder="person.john"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location Sensor</Label>
                  <EntityAutocomplete
                    value={person.locationEntity}
                    onChange={(val) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], locationEntity: val };
                      setPersonEntities(updated);
                    }}
                    config={config}
                    domainFilter="sensor"
                    placeholder="sensor.john_geocoded_location"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Battery Sensor</Label>
                  <EntityAutocomplete
                    value={person.batteryEntity}
                    onChange={(val) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], batteryEntity: val };
                      setPersonEntities(updated);
                    }}
                    config={config}
                    domainFilter="sensor"
                    placeholder="sensor.john_phone_battery_level"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Charging Sensor (binary)</Label>
                  <EntityAutocomplete
                    value={person.batteryChargingEntity}
                    onChange={(val) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], batteryChargingEntity: val };
                      setPersonEntities(updated);
                    }}
                    config={config}
                    domainFilter="binary_sensor"
                    placeholder="binary_sensor.john_phone_is_charging"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Distance from Home (km)</Label>
                  <EntityAutocomplete
                    value={person.distanceEntity}
                    onChange={(val) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], distanceEntity: val };
                      setPersonEntities(updated);
                    }}
                    config={config}
                    domainFilter="sensor"
                    placeholder="sensor.john_distance_from_home"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Avatar Size (px)</Label>
                  <Input
                    value={person.avatarSize || 80}
                    onChange={(e) => {
                      const updated = [...personEntities];
                      updated[i] = { ...updated[i], avatarSize: Number(e.target.value) || 80 };
                      setPersonEntities(updated);
                    }}
                    type="number"
                    min={40}
                    max={300}
                    placeholder="80"
                    className="mt-1 bg-muted border-border text-sm"
                  />
                </div>
              </div>
            ))}
          </section>


          <section className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Electricity Price (Nordpool)
            </h3>
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

          {/* Widget Layout */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Widget Layout
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Grid Columns</Label>
              <Select
                value={String(gridColumns)}
                onValueChange={(v) => setGridColumns(Number(v))}
              >
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
                          if (val === gridColumns) {
                            delete next[row];
                          } else {
                            next[row] = val;
                          }
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
            <p className="text-xs text-muted-foreground">
              Drag to reorder widgets. Set column span per widget.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={widgetItems.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
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
                        maxCols={gridColumns}
                        onColSpanChange={(span) => updateLayout(id, { colSpan: span })}
                        onRowChange={(row) => updateLayout(id, { row })}
                        onRowSpanChange={(rowSpan) => updateLayout(id, { rowSpan })}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* Photo Gallery */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Photo Gallery
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Rotation Interval (seconds)</Label>
              <Input
                value={photoConfig.intervalSeconds}
                onChange={(e) => setPhotoConfig((prev) => ({ ...prev, intervalSeconds: Number(e.target.value) || 10 }))}
                type="number"
                min={1}
                className="mt-1 bg-muted border-border"
              />
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
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
        </div>
      </div>
    </div>
  );
}
