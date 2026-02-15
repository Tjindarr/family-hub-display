import { useState } from "react";
import { Settings, X, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import type { DashboardConfig, TemperatureEntityConfig } from "@/lib/config";

interface ConfigPanelProps {
  config: DashboardConfig;
  onSave: (updates: Partial<DashboardConfig>) => void;
}

export default function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [haUrl, setHaUrl] = useState(config.haUrl);
  const [haToken, setHaToken] = useState(config.haToken);
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval);
  const [tempEntities, setTempEntities] = useState<TemperatureEntityConfig[]>(config.temperatureEntities);
  const [calendarEntities, setCalendarEntities] = useState<string[]>(config.calendarEntities);
  const [electricityEntity, setElectricityEntity] = useState(config.electricityPriceEntity);

  const handleSave = () => {
    onSave({
      haUrl,
      haToken,
      refreshInterval,
      temperatureEntities: tempEntities,
      calendarEntities,
      electricityPriceEntity: electricityEntity,
    });
    setOpen(false);
  };

  const addTempEntity = () => {
    setTempEntities([
      ...tempEntities,
      { entityId: "", label: "", color: "hsl(174, 72%, 50%)" },
    ]);
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
              Electricity Price
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Price Entity</Label>
              <EntityAutocomplete
                value={electricityEntity}
                onChange={setElectricityEntity}
                config={config}
                domainFilter="sensor"
                placeholder="sensor.electricity_price"
                className="mt-1 bg-muted border-border text-sm"
              />
            </div>
          </section>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
