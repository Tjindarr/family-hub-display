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
            {w.buttons.map((b, bi) => (
              <div key={b.id} className="space-y-2 p-2 rounded bg-background/40">
                <div className="flex items-center gap-2">
                  <Input className="h-7 text-xs bg-muted border-border flex-1" value={b.label} onChange={(e) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
                  <IconPicker value={b.icon} onChange={(v) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, icon: v } : x) })} />
                  <ColorPicker value={b.color || ""} onChange={(v) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, color: v || undefined } : x) })} />
                  <Button size="icon" variant="ghost" onClick={() => upd(wi, { buttons: w.buttons.filter((_, i) => i !== bi) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <ActionEditor value={b.action} config={config} onChange={(a) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, action: a || { type: "toggle", entityId: "" } } : x) })} />
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1"><Switch checked={!!b.confirm} onCheckedChange={(c) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, confirm: c } : x) })} /> Confirm</label>
                  <div className="flex items-center gap-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">State entity</Label>
                    <Input className="h-6 text-[11px] bg-muted border-border flex-1" placeholder="(optional)" value={b.stateEntityId || ""} onChange={(e) => upd(wi, { buttons: w.buttons.map((x, i) => i === bi ? { ...x, stateEntityId: e.target.value || undefined } : x) })} />
                  </div>
                </div>
              </div>
            ))}
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

