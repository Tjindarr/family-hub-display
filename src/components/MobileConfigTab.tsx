import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import IconPicker from "@/components/IconPicker";
import ColorPicker from "@/components/ColorPicker";
import EntityAutocomplete from "@/components/EntityAutocomplete";
import type {
  ActionWidgetConfig, ActionButtonConfig, EntityAction,
  MobileLayoutConfig, MobileSection, MobileItem, MobileDashboardConfig,
  SensorGridConfig, GeneralSensorConfig, DashboardConfig,
  CameraGridConfig, CameraConfig, RssNewsConfig, VehicleConfig,
  ParcelWidgetConfig, PersonEntityConfig, TemperatureEntityConfig,
  WeatherConfig, CalendarEntityConfig, CalendarDisplayConfig,
  PhotoWidgetConfig, FoodMenuConfig, PollenConfig, NotificationConfig,
  ChoreWidgetConfig,
} from "@/lib/config";


function uid() { return Math.random().toString(36).slice(2, 10); }

export function ActionEditor({ value, onChange, config }: { value?: EntityAction; onChange: (v: EntityAction | undefined) => void; config: DashboardConfig }) {
  const type = value?.type || "none";
  return (
    <div className="space-y-2 p-2 rounded border border-border/40 bg-muted/20">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground w-14">Action</Label>
        <Select value={type} onValueChange={(t) => {
          if (t === "none") onChange(undefined);
          else if (t === "toggle") onChange({ type: "toggle", entityId: (value as any)?.entityId || "" });
          else if (t === "service") onChange({ type: "service", domain: (value as any)?.domain || "", service: (value as any)?.service || "", data: (value as any)?.data });
          else if (t === "navigate") onChange({ type: "navigate", url: (value as any)?.url || "" });
        }}>
          <SelectTrigger className="h-7 text-xs bg-muted border-border flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="toggle">Toggle entity</SelectItem>
            <SelectItem value="service">Call service</SelectItem>
            <SelectItem value="navigate">Open URL</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value?.type === "toggle" && (
        <EntityAutocomplete value={value.entityId} onChange={(v) => onChange({ type: "toggle", entityId: v })} config={config} placeholder="light.kitchen" />
      )}
      {value?.type === "service" && (
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-7 text-xs bg-muted border-border" placeholder="domain (e.g. light)" value={value.domain} onChange={(e) => onChange({ ...value, domain: e.target.value })} />
          <Input className="h-7 text-xs bg-muted border-border" placeholder="service (e.g. turn_on)" value={value.service} onChange={(e) => onChange({ ...value, service: e.target.value })} />
          <Textarea
            className="col-span-2 text-xs bg-muted border-border min-h-[50px]"
            placeholder='Data JSON (optional), e.g. {"entity_id":"light.kitchen","brightness":120}'
            value={value.data ? JSON.stringify(value.data) : ""}
            onChange={(e) => {
              const t = e.target.value.trim();
              if (!t) { onChange({ ...value, data: undefined }); return; }
              try { onChange({ ...value, data: JSON.parse(t) }); } catch { /* ignore until valid */ }
            }}
          />
        </div>
      )}
      {value?.type === "navigate" && (
        <Input className="h-7 text-xs bg-muted border-border" placeholder="https://..." value={value.url} onChange={(e) => onChange({ type: "navigate", url: e.target.value })} />
      )}
    </div>
  );
}

export function ActionWidgetsEditor({ widgets, onChange, config }: { widgets: ActionWidgetConfig[]; onChange: (w: ActionWidgetConfig[]) => void; config: DashboardConfig }) {
  const add = () => onChange([...widgets, { id: uid(), label: "Quick Actions", columns: 3, buttons: [] }]);
  const remove = (i: number) => onChange(widgets.filter((_, x) => x !== i));
  const upd = (i: number, p: Partial<ActionWidgetConfig>) => onChange(widgets.map((w, x) => x === i ? { ...w, ...p } : w));
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Action Widgets</h3>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </div>
      {widgets.length === 0 && <p className="text-[11px] text-muted-foreground">Add a widget with one or more HA action buttons.</p>}
      {widgets.map((w, wi) => (
        <div key={w.id} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/40">
          <div className="flex items-center gap-2">
            <Input className="h-7 text-xs bg-muted border-border flex-1" value={w.label} onChange={(e) => upd(wi, { label: e.target.value })} placeholder="Label" />
            <Label className="text-[10px] text-muted-foreground">Cols</Label>
            <Input type="number" min={1} max={6} className="h-7 w-14 text-xs bg-muted border-border" value={w.columns} onChange={(e) => upd(wi, { columns: Math.max(1, Math.min(6, Number(e.target.value) || 2)) })} />
            <Button size="icon" variant="ghost" onClick={() => remove(wi)}><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-2 pl-2 border-l border-border/40">
            {w.buttons.map((b, bi) => {
              const updBtn = (patch: Partial<ActionButtonConfig>) =>
                upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, ...patch } : x) });
              return (
              <div key={b.id} className="space-y-2 p-2 rounded bg-background/40">
                <div className="flex items-center gap-2">
                  <Input className="h-7 text-xs bg-muted border-border flex-1" value={b.label} onChange={(e) => updBtn({ label: e.target.value })} placeholder="Label" />
                  <IconPicker value={b.icon} onChange={(v) => updBtn({ icon: v })} />
                  <ColorPicker value={b.color || ""} onChange={(v) => updBtn({ color: v || undefined })} />
                  <Button size="icon" variant="ghost" onClick={() => upd(wi, { buttons: w.buttons.filter((_, i) => i !== bi) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <ActionEditor value={b.action} config={config} onChange={(a) => updBtn({ action: a || { type: "toggle", entityId: "" } })} />
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1"><Switch checked={!!b.confirm} onCheckedChange={(c) => updBtn({ confirm: c })} /> Confirm</label>
                  <div className="flex items-center gap-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">State entity</Label>
                    <Input className="h-6 text-[11px] bg-muted border-border flex-1" placeholder="(optional) sensor.x or sensor.x.attribute" value={b.stateEntityId ? (b.stateAttribute ? `${b.stateEntityId}.${b.stateAttribute}` : b.stateEntityId) : ""} onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) { updBtn({ stateEntityId: undefined, stateAttribute: undefined }); return; }
                      const parts = raw.split(".");
                      if (parts.length >= 3) updBtn({ stateEntityId: `${parts[0]}.${parts[1]}`, stateAttribute: parts.slice(2).join(".") });
                      else updBtn({ stateEntityId: raw, stateAttribute: undefined });
                    }} />
                  </div>
                </div>
                {b.stateEntityId && (
                  <div className="space-y-1.5 p-2 rounded bg-muted/20 border border-border/30">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">State styling</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Active (on) color</Label>
                        <ColorPicker value={b.activeColor || ""} onChange={(v) => updBtn({ activeColor: v || undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Inactive (off) color</Label>
                        <ColorPicker value={b.inactiveColor || ""} onChange={(v) => updBtn({ inactiveColor: v || undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Active background</Label>
                        <ColorPicker value={b.activeBgColor || ""} onChange={(v) => updBtn({ activeBgColor: v || undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Inactive background</Label>
                        <ColorPicker value={b.inactiveBgColor || ""} onChange={(v) => updBtn({ inactiveBgColor: v || undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Active icon (optional)</Label>
                        <IconPicker value={b.activeIcon || ""} onChange={(v) => updBtn({ activeIcon: v || undefined })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Active states (comma)</Label>
                        <Input className="h-7 text-[11px] bg-muted border-border" placeholder="on, open, home" value={(b.activeStates || []).join(", ")} onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          updBtn({ activeStates: list.length ? list : undefined });
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => upd(wi, { buttons: [...w.buttons, { id: uid(), label: "Button", icon: "mdi:gesture-tap-button", action: { type: "toggle", entityId: "" } }] })}>
              <Plus className="h-3 w-3 mr-1" /> Add button
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function CameraGridsEditor({ widgets, onChange, config }: { widgets: CameraGridConfig[]; onChange: (w: CameraGridConfig[]) => void; config: DashboardConfig }) {
  const add = () => onChange([...widgets, { id: uid(), label: "Cameras", columns: 2, refreshSeconds: 30, aspectRatio: "16:9", cameras: [] }]);
  const remove = (i: number) => onChange(widgets.filter((_, x) => x !== i));
  const upd = (i: number, p: Partial<CameraGridConfig>) => onChange(widgets.map((w, x) => x === i ? { ...w, ...p } : w));
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Camera Grids</h3>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </div>
      {widgets.length === 0 && <p className="text-[11px] text-muted-foreground">Add a widget that displays snapshots from Home Assistant camera entities, refreshed on an interval.</p>}
      {widgets.map((w, wi) => (
        <div key={w.id} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            <Input className="h-7 text-xs bg-muted border-border flex-1 min-w-[120px]" value={w.label} onChange={(e) => upd(wi, { label: e.target.value })} placeholder="Label" />
            <Label className="text-[10px] text-muted-foreground">Cols</Label>
            <Input type="number" min={1} max={6} className="h-7 w-14 text-xs bg-muted border-border" value={w.columns} onChange={(e) => upd(wi, { columns: Math.max(1, Math.min(6, Number(e.target.value) || 2)) })} />
            <Label className="text-[10px] text-muted-foreground">Every (s)</Label>
            <Input type="number" min={2} max={3600} className="h-7 w-20 text-xs bg-muted border-border" value={w.refreshSeconds} onChange={(e) => upd(wi, { refreshSeconds: Math.max(2, Number(e.target.value) || 30) })} />
            <Label className="text-[10px] text-muted-foreground">Aspect</Label>
            <Select value={w.aspectRatio || "16:9"} onValueChange={(v) => upd(wi, { aspectRatio: v as any })}>
              <SelectTrigger className="h-7 w-20 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
                <SelectItem value="3:2">3:2</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => remove(wi)}><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-1.5 pl-2 border-l border-border/40">
            {w.cameras.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-4">{ci + 1}</span>
                <EntityAutocomplete value={c.entityId} onChange={(v) => upd(wi, { cameras: w.cameras.map((x, i) => i === ci ? { ...x, entityId: v } : x) })} config={config} domainFilter="camera" placeholder="camera.front_door" />
                <Input className="h-7 text-xs bg-muted border-border w-40" value={c.label} onChange={(e) => upd(wi, { cameras: w.cameras.map((x, i) => i === ci ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
                <Button size="icon" variant="ghost" onClick={() => upd(wi, { cameras: w.cameras.filter((_, i) => i !== ci) })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => upd(wi, { cameras: [...w.cameras, { entityId: "", label: "" }] })}>
              <Plus className="h-3 w-3 mr-1" /> Add camera
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function MobileLayoutEditor({
  layout, onChange, sensorGrids, generalSensors, actionWidgets, cameraGrids, availableWidgets,
}: {
  layout: MobileLayoutConfig;
  onChange: (l: MobileLayoutConfig) => void;
  sensorGrids: SensorGridConfig[];
  generalSensors: GeneralSensorConfig[];
  actionWidgets: ActionWidgetConfig[];
  cameraGrids?: CameraGridConfig[];
  availableWidgets?: { id: string; label: string }[];
}) {
  const sections = layout.sections || [];
  const setSections = (s: MobileSection[]) => onChange({ sections: s });
  const updS = (i: number, p: Partial<MobileSection>) => setSections(sections.map((s, x) => x === i ? { ...s, ...p } : s));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const arr = [...sections];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSections(arr);
  };

  const refOptions = (kind: string): { id: string; label: string }[] => {
    if (kind === "sensorGrid") return sensorGrids.map((g) => ({ id: g.id, label: g.label || g.id }));
    if (kind === "generalSensor") return generalSensors.map((g) => ({ id: g.id, label: g.label || g.id }));
    if (kind === "actionWidget") return actionWidgets.map((g) => ({ id: g.id, label: g.label || g.id }));
    if (kind === "cameraGrid") return (cameraGrids || []).map((g) => ({ id: g.id, label: g.label || g.id }));
    if (kind === "widget") return availableWidgets || [];
    return [];
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-primary">Mobile Layout (/mobile)</h3>
        <Button size="sm" variant="outline" onClick={() => setSections([...sections, { id: uid(), title: "Section", items: [] }])}>
          <Plus className="h-3 w-3 mr-1" /> Add section
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Compact phone view at <code>/mobile</code>. Add sections that reference existing sensor grids, general sensors, action widgets, camera grids — or pick "Any widget" to mirror a dashboard widget (weather, calendar, person, etc.).</p>
      {sections.map((sec, si) => (
        <div key={sec.id} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/40">
          <div className="flex items-center gap-2">
            <Input className="h-7 text-xs bg-muted border-border flex-1" value={sec.title} onChange={(e) => updS(si, { title: e.target.value })} placeholder="Section title" />
            <Button size="icon" variant="ghost" onClick={() => move(si, -1)}><ArrowUp className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={() => move(si, 1)}><ArrowDown className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setSections(sections.filter((_, x) => x !== si))}><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-1 pl-2 border-l border-border/40">
            {(sec.items || []).map((it, ii) => {
              const opts = refOptions(it.kind);
              return (
                <div key={ii} className="flex items-center gap-2">
                  <Select value={it.kind} onValueChange={(v) => updS(si, { items: sec.items.map((x, i) => i === ii ? { kind: v as any, refId: "" } : x) })}>
                    <SelectTrigger className="h-7 text-xs bg-muted border-border w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sensorGrid">Sensor Grid</SelectItem>
                      <SelectItem value="generalSensor">General Sensor</SelectItem>
                      <SelectItem value="actionWidget">Action Widget</SelectItem>
                      <SelectItem value="cameraGrid">Camera Grid</SelectItem>
                      <SelectItem value="widget">Any widget</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={it.refId || ""} onValueChange={(v) => updS(si, { items: sec.items.map((x, i) => i === ii ? { ...x, refId: v } : x) })}>
                    <SelectTrigger className="h-7 text-xs bg-muted border-border flex-1"><SelectValue placeholder="Pick…" /></SelectTrigger>
                    <SelectContent>
                      {opts.length === 0 && <SelectItem value="__none" disabled>None available</SelectItem>}
                      {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => updS(si, { items: sec.items.filter((_, i) => i !== ii) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => updS(si, { items: [...(sec.items || []), { kind: "sensorGrid" as const, refId: "" } satisfies MobileItem] })}>
              <Plus className="h-3 w-3 mr-1" /> Add item
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

// ── Mobile Dashboard editor ──
// Allows the user to:
// 1. Manage mobile-only widget instances (sensor grids, general sensors, action widgets,
//    camera grids, RSS feeds, vehicles).
// 2. Mirror widgets from the main dashboard (just add their id to widgetOrder).
// 3. Pick grid columns and lock-heights for the mobile grid.
// Drag-to-reorder / sizing is handled by the standard DashboardEditOverlay on /mobile.
export function MobileDashboardEditor({
  value, onChange, config, mainWidgets,
}: {
  value: MobileDashboardConfig;
  onChange: (v: MobileDashboardConfig) => void;
  config: DashboardConfig;
  mainWidgets: { id: string; label: string }[];
}) {
  const upd = (p: Partial<MobileDashboardConfig>) => onChange({ ...value, ...p });

  const widgetOrder = value.widgetOrder || [];
  const addToOrder = (id: string) => {
    if (!id || widgetOrder.includes(id)) return;
    upd({ widgetOrder: [...widgetOrder, id] });
  };
  const removeFromOrder = (id: string) => upd({ widgetOrder: widgetOrder.filter((x) => x !== id) });
  const moveInOrder = (id: string, dir: -1 | 1) => {
    const i = widgetOrder.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= widgetOrder.length) return;
    const arr = [...widgetOrder];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    upd({ widgetOrder: arr });
  };

  // Build label map: main widgets (mirror) + mobile-owned
  const mobileLabels: Record<string, string> = {};
  value.sensorGrids.forEach((g) => { mobileLabels[`sensorgrid_${g.id}`] = `📱 ${g.label || g.id}`; });
  value.generalSensors.forEach((g) => { mobileLabels[`general_${g.id}`] = `📱 ${g.label || g.id}`; });
  value.actionWidgets.forEach((g) => { mobileLabels[`action_${g.id}`] = `📱 ${g.label || g.id}`; });
  value.cameraGrids.forEach((g) => { mobileLabels[`cameragrid_${g.id}`] = `📱 ${g.label || g.id}`; });
  value.rssFeeds.forEach((g) => { mobileLabels[`rss_${g.id}`] = `📱 ${g.label || g.id}`; });
  value.vehicles.forEach((g) => { mobileLabels[`vehicle_${g.id}`] = `📱 ${g.name || g.id}`; });
  const mainLabels: Record<string, string> = Object.fromEntries(mainWidgets.map((w) => [w.id, w.label]));
  const labelOf = (id: string) => mobileLabels[id] || mainLabels[id] || id;

  // Selectable widgets to add: mobile-owned not yet in order + main widgets not yet in order
  const addableMobile = Object.keys(mobileLabels).filter((id) => !widgetOrder.includes(id));
  const addableMain = mainWidgets.filter((w) => !widgetOrder.includes(w.id));

  return (
    <div className="space-y-5">
      {/* Grid settings */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Grid</h4>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground">Columns</Label>
            <Select value={String(value.gridColumns || 2)} onValueChange={(v) => upd({ gridColumns: Number(v) })}>
              <SelectTrigger className="h-7 w-16 bg-muted border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[11px]">
            <Switch checked={!!value.lockWidgetHeights} onCheckedChange={(c) => upd({ lockWidgetHeights: c })} />
            Lock widget heights
          </label>
          <p className="text-[10px] text-muted-foreground basis-full">Use the "Edit" button on /mobile to drag, resize and arrange widgets in the grid.</p>
        </div>
      </section>

      {/* Order list */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Widgets on /mobile</h4>
        {widgetOrder.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No widgets yet. Add mobile-only widgets below, or mirror widgets from the main dashboard.</p>
        )}
        <div className="space-y-1">
          {widgetOrder.map((id) => (
            <div key={id} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 border border-border/40">
              <span className="text-[11px] flex-1 truncate">{labelOf(id)}</span>
              <span className="text-[9px] text-muted-foreground font-mono">{id}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveInOrder(id, -1)}><ArrowUp className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveInOrder(id, 1)}><ArrowDown className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromOrder(id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>

        {/* Add widget */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {addableMobile.length > 0 && (
            <Select value="" onValueChange={(v) => v && addToOrder(v)}>
              <SelectTrigger className="h-7 text-xs bg-muted border-border w-56"><SelectValue placeholder="+ Add mobile widget…" /></SelectTrigger>
              <SelectContent>
                {addableMobile.map((id) => <SelectItem key={id} value={id}>{labelOf(id)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {addableMain.length > 0 && (
            <Select value="" onValueChange={(v) => v && addToOrder(v)}>
              <SelectTrigger className="h-7 text-xs bg-muted border-border w-56"><SelectValue placeholder="+ Mirror from main dashboard…" /></SelectTrigger>
              <SelectContent>
                {addableMain.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {/* Mobile-only widget instance editors */}
      <section className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Mobile-only Sensor Grids</h4>
        <MobileSensorGridList value={value.sensorGrids} onChange={(v) => upd({ sensorGrids: v })} config={config} />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Mobile-only Action Widgets</h4>
        <ActionWidgetsEditor widgets={value.actionWidgets} onChange={(v) => upd({ actionWidgets: v })} config={config} />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Mobile-only Camera Grids</h4>
        <CameraGridsEditor widgets={value.cameraGrids} onChange={(v) => upd({ cameraGrids: v })} config={config} />
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-primary">Mobile-only RSS Feeds</h4>
        <MobileRssFeedList value={value.rssFeeds} onChange={(v) => upd({ rssFeeds: v })} />
      </section>

      <p className="text-[10px] text-muted-foreground">
        Tip: General Sensor and Vehicle widgets are complex to configure — manage them in the Widgets tab on the main dashboard and mirror them here.
      </p>
    </div>
  );
}

// Compact in-place sensor grid editor (minimal viable — full editor lives in the Widgets tab)
function MobileSensorGridList({ value, onChange, config }: { value: SensorGridConfig[]; onChange: (v: SensorGridConfig[]) => void; config: DashboardConfig }) {
  const add = () => onChange([...value, { id: uid(), label: "Sensors", rows: 2, columns: 3, cells: [] }]);
  const remove = (i: number) => onChange(value.filter((_, x) => x !== i));
  const upd = (i: number, p: Partial<SensorGridConfig>) => onChange(value.map((w, x) => x === i ? { ...w, ...p } : w));
  return (
    <div className="space-y-2">
      {value.map((g, gi) => (
        <div key={g.id} className="space-y-2 p-2 rounded bg-muted/30 border border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            <Input className="h-7 text-xs bg-muted border-border flex-1 min-w-[120px]" value={g.label} onChange={(e) => upd(gi, { label: e.target.value })} placeholder="Label" />
            <Label className="text-[10px] text-muted-foreground">Cols</Label>
            <Input type="number" min={1} max={6} className="h-7 w-14 text-xs bg-muted border-border" value={g.columns} onChange={(e) => upd(gi, { columns: Math.max(1, Math.min(6, Number(e.target.value) || 3)) })} />
            <Label className="text-[10px] text-muted-foreground">Rows</Label>
            <Input type="number" min={1} max={8} className="h-7 w-14 text-xs bg-muted border-border" value={g.rows} onChange={(e) => upd(gi, { rows: Math.max(1, Math.min(8, Number(e.target.value) || 2)) })} />
            <Button size="icon" variant="ghost" onClick={() => remove(gi)}><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-1 pl-2 border-l border-border/40">
            {g.cells.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground w-4">{ci + 1}</span>
                <EntityAutocomplete value={c.entityId} onChange={(v) => upd(gi, { cells: g.cells.map((x, i) => i === ci ? { ...x, entityId: v } : x) })} config={config} placeholder="sensor.foo" />
                <Input className="h-7 text-xs bg-muted border-border w-28" value={c.label} onChange={(e) => upd(gi, { cells: g.cells.map((x, i) => i === ci ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
                <IconPicker value={c.icon} onChange={(v) => upd(gi, { cells: g.cells.map((x, i) => i === ci ? { ...x, icon: v } : x) })} />
                <Input className="h-7 text-xs bg-muted border-border w-16" value={c.unit} onChange={(e) => upd(gi, { cells: g.cells.map((x, i) => i === ci ? { ...x, unit: e.target.value } : x) })} placeholder="Unit" />
                <ColorPicker value={c.color || ""} onChange={(v) => upd(gi, { cells: g.cells.map((x, i) => i === ci ? { ...x, color: v } : x) })} />
                <Button size="icon" variant="ghost" onClick={() => upd(gi, { cells: g.cells.filter((_, i) => i !== ci) })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => upd(gi, { cells: [...g.cells, { entityId: "", label: "", icon: "mdi:gauge", unit: "", color: "hsl(174, 72%, 50%)" }] })}>
              <Plus className="h-3 w-3 mr-1" /> Add cell
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Add sensor grid</Button>
    </div>
  );
}

function MobileRssFeedList({ value, onChange }: { value: RssNewsConfig[]; onChange: (v: RssNewsConfig[]) => void }) {
  const add = () => onChange([...value, { id: uid(), label: "News", feedUrl: "", maxItems: 5 }]);
  const remove = (i: number) => onChange(value.filter((_, x) => x !== i));
  const upd = (i: number, p: Partial<RssNewsConfig>) => onChange(value.map((w, x) => x === i ? { ...w, ...p } : w));
  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={f.id} className="flex items-center gap-2 flex-wrap p-2 rounded bg-muted/30 border border-border/40">
          <Input className="h-7 text-xs bg-muted border-border w-28" value={f.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Label" />
          <Input className="h-7 text-xs bg-muted border-border flex-1 min-w-[200px]" value={f.feedUrl} onChange={(e) => upd(i, { feedUrl: e.target.value })} placeholder="https://example.com/feed.xml" />
          <Label className="text-[10px] text-muted-foreground">Max</Label>
          <Input type="number" min={1} max={50} className="h-7 w-14 text-xs bg-muted border-border" value={f.maxItems} onChange={(e) => upd(i, { maxItems: Math.max(1, Number(e.target.value) || 5) })} />
          <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Add RSS feed</Button>
    </div>
  );
}


