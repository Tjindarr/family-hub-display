import { useState, useMemo } from "react";
import { Settings, X, Plus, Trash2, Save, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import type { DashboardConfig, TemperatureEntityConfig, WidgetLayout } from "@/lib/config";
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
  maxCols: number;
  onColSpanChange: (span: number) => void;
  onRowChange: (row: number) => void;
}

function SortableWidgetItem({ id, label, colSpan, row, maxCols, onColSpanChange, onRowChange }: SortableWidgetItemProps) {
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
          <SelectTrigger className="w-16 h-8 bg-muted border-border text-xs">
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
          <SelectTrigger className="w-16 h-8 bg-muted border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxCols }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function getDefaultWidgetIds(tempCount: number): string[] {
  return [
    "clock",
    ...Array.from({ length: tempCount }, (_, i) => `temp_${i}`),
    "electricity",
    "calendar",
  ];
}

export default function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [haUrl, setHaUrl] = useState(config.haUrl);
  const [haToken, setHaToken] = useState(config.haToken);
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval);
  const [configBackendUrl, setConfigBackendUrl] = useState(config.configBackendUrl || "");
  const [tempEntities, setTempEntities] = useState<TemperatureEntityConfig[]>(config.temperatureEntities);
  const [calendarEntities, setCalendarEntities] = useState<string[]>(config.calendarEntities);
  const [electricityEntity, setElectricityEntity] = useState(config.electricityPriceEntity);
  const [widgetLayouts, setWidgetLayouts] = useState<Record<string, WidgetLayout>>(config.widgetLayouts || {});
  const [gridColumns, setGridColumns] = useState(config.gridColumns || 4);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const defaults = getDefaultWidgetIds(config.temperatureEntities.length);
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
    const labelMap: Record<string, string> = { clock: "Clock", electricity: "Electricity Price", calendar: "Calendar" };
    tempEntities.forEach((e, i) => { labelMap[`temp_${i}`] = e.label || `Sensor ${i + 1}`; });

    const defaults = getDefaultWidgetIds(tempEntities.length);
    const validSet = new Set(defaults);
    const currentValid = widgetOrder.filter((id) => validSet.has(id));
    const missing = defaults.filter((id) => !currentValid.includes(id));
    const finalOrder = [...currentValid, ...missing];

    return finalOrder.map((id) => ({
      id,
      label: labelMap[id] || id,
      defaultSpan: id === "electricity" || id === "calendar" ? 2 : 1,
    }));
  }, [widgetOrder, tempEntities]);

  const getColSpan = (id: string, fallback = 1) => widgetLayouts[id]?.colSpan || fallback;
  const getRow = (id: string, fallback = 1) => widgetLayouts[id]?.row || fallback;
  const updateLayout = (id: string, updates: Partial<WidgetLayout>) =>
    setWidgetLayouts((prev) => ({
      ...prev,
      [id]: { colSpan: prev[id]?.colSpan || 1, row: prev[id]?.row || 1, ...updates },
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
      calendarEntities,
      electricityPriceEntity: electricityEntity,
      widgetLayouts,
      widgetOrder: finalOrder,
      gridColumns,
      configBackendUrl,
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

          {/* Config Backend */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Config Persistence
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Backend URL (json-server)</Label>
              <Input
                value={configBackendUrl}
                onChange={(e) => setConfigBackendUrl(e.target.value)}
                placeholder="http://192.168.1.x:3001"
                className="mt-1 bg-muted border-border"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Point to a json-server instance to persist settings across browsers. Leave empty to use browser storage only.
              </p>
            </div>
          </section>

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
            <h3 className="text-sm font-medium uppercase tracking-wider text-primary">
              Calendar Entities
            </h3>
            {calendarEntities.map((cal, i) => (
              <div key={i} className="flex gap-2">
                <EntityAutocomplete
                  value={cal}
                  onChange={(val) => {
                    const updated = [...calendarEntities];
                    updated[i] = val;
                    setCalendarEntities(updated);
                  }}
                  config={config}
                  domainFilter="calendar"
                  placeholder="calendar.family"
                  className="bg-muted border-border text-sm"
                />
                {calendarEntities.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setCalendarEntities(calendarEntities.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCalendarEntities([...calendarEntities, ""])}
              className="text-primary"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Calendar
            </Button>
          </section>

          {/* Electricity */}
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
                  {widgetItems.map(({ id, label, defaultSpan }) => (
                    <SortableWidgetItem
                      key={id}
                      id={id}
                      label={label}
                      colSpan={getColSpan(id, defaultSpan)}
                      row={getRow(id, id === "electricity" || id === "calendar" ? 2 : 1)}
                      maxCols={gridColumns}
                      onColSpanChange={(span) => updateLayout(id, { colSpan: span })}
                      onRowChange={(row) => updateLayout(id, { row })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
