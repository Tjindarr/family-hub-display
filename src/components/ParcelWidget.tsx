import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { HAState, ParcelWidgetConfig } from "@/lib/config";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

interface ParcelWidgetProps {
  config: ParcelWidgetConfig;
  getState?: (entityId: string) => HAState | undefined;
  onStateChange?: (entityId: string, cb: (state: HAState) => void) => () => void;
  fontSizes?: ResolvedFontSizes;
}

interface ParcelEvent {
  event: string;
  date: string;
}

interface Delivery {
  carrier_code?: string;
  description?: string;
  status_code?: number | string;
  tracking_number?: string;
  events?: ParcelEvent[];
}

// Map common HA "parcel" integration carrier codes -> mdi icon
const CARRIER_ICONS: Record<string, string> = {
  aliex: "mdi:package-variant-closed",
  aliexpress: "mdi:package-variant-closed",
  postnord: "mdi:truck-delivery",
  posten: "mdi:truck-delivery",
  dhl: "mdi:truck-fast",
  ups: "mdi:truck",
  fedex: "mdi:truck-fast-outline",
  dpd: "mdi:truck-delivery-outline",
  gls: "mdi:truck-cargo-container",
  hermes: "mdi:truck-delivery",
  schenker: "mdi:truck-cargo-container",
  bring: "mdi:truck-delivery",
  amazon: "mdi:package-variant",
  usps: "mdi:mailbox",
  royalmail: "mdi:mailbox",
};

function carrierIcon(code?: string): string {
  if (!code) return "mdi:package-variant";
  const key = code.toLowerCase();
  return CARRIER_ICONS[key] || "mdi:package-variant";
}

function parseDate(s: string): number {
  if (!s) return 0;
  // Try ISO first
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;
  // dd.MM.yyyy HH:mm
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (m) {
    const [, d, mo, y, h, mi] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi).getTime();
  }
  return 0;
}

function latestEvent(events?: ParcelEvent[]): ParcelEvent | null {
  if (!events || events.length === 0) return null;
  // Most sensors put newest first; verify by parsing dates.
  const sorted = [...events].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  return sorted[0] || events[0];
}

function isDelivered(d: Delivery): boolean {
  const code = typeof d.status_code === "string" ? d.status_code.toLowerCase() : d.status_code;
  if (code === 4 || code === "4" || code === "delivered") return true;
  const ev = latestEvent(d.events)?.event?.toLowerCase() || "";
  return /delivered|levererat|utlämnad|picked up/.test(ev);
}

export default function ParcelWidget({ config, getState, onStateChange, fontSizes }: ParcelWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
  const [state, setState] = useState<HAState | undefined>(() => (config.entityId && getState ? getState(config.entityId) : undefined));

  useEffect(() => {
    if (!config.entityId) return;
    if (getState) setState(getState(config.entityId));
    if (!onStateChange) return;
    const unsub = onStateChange(config.entityId, (s) => setState(s));
    return () => unsub();
  }, [config.entityId, getState, onStateChange]);

  const { deliveries, loading } = useMemo(() => {
    if (!config.entityId) return { deliveries: [] as Delivery[], loading: false };
    if (!state) return { deliveries: [] as Delivery[], loading: true };
    const raw: Delivery[] = state.attributes?.deliveries || [];
    const filtered = raw.filter((d) => !isDelivered(d));
    return { deliveries: filtered, loading: false };
  }, [state, config.entityId]);

  if (!config.entityId) {
    return (
      <div className="widget-card h-full p-3">
        <p className="text-muted-foreground" style={{ fontSize: fs.label }}>
          Configure a Parcel entity in Settings
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="widget-card h-full p-3 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="widget-card h-full p-2 flex flex-col">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Icon icon="mdi:package-down" className="w-3.5 h-3.5 text-muted-foreground" />
        <span
          className="font-medium uppercase tracking-wider text-muted-foreground"
          style={{ fontSize: fs.label }}
        >
          {config.label || "Parcels"}
        </span>
        <span className="ml-auto text-muted-foreground" style={{ fontSize: fs.label }}>
          {deliveries.length}
        </span>
      </div>

      {deliveries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground" style={{ fontSize: fs.body }}>
          No parcels in transit
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
          {deliveries.map((d, i) => {
            const ev = latestEvent(d.events);
            return (
              <div
                key={(d.tracking_number || "") + i}
                className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/30 border border-border/30"
              >
                <Icon
                  icon={carrierIcon(d.carrier_code)}
                  className="shrink-0 mt-0.5 text-foreground/80"
                  style={{ width: 22, height: 22 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium truncate" style={{ fontSize: fs.body }}>
                      {d.description || "(no description)"}
                    </span>
                    {d.tracking_number && (
                      <span
                        className="ml-auto font-mono text-muted-foreground shrink-0"
                        style={{ fontSize: fs.label }}
                      >
                        {d.tracking_number}
                      </span>
                    )}
                  </div>
                  {ev && (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="truncate" style={{ fontSize: fs.heading, color: "hsl(var(--muted-foreground))" }}>
                        {ev.event}
                      </span>
                      <span
                        className="ml-auto shrink-0 text-muted-foreground"
                        style={{ fontSize: fs.label }}
                      >
                        {ev.date}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
