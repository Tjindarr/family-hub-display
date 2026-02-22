import { Bell, AlertTriangle, BatteryLow, Info } from "lucide-react";
import type { NotificationItem } from "@/hooks/useNotificationData";
import type { WidgetFontSizes, WidgetStyleConfig } from "@/lib/config";

const ICON_MAP: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  bell: Bell,
  "alert-triangle": AlertTriangle,
  "battery-low": BatteryLow,
  info: Info,
};

interface NotificationWidgetProps {
  notifications: NotificationItem[];
  loading: boolean;
  fontSizes?: WidgetFontSizes;
  widgetStyle?: WidgetStyleConfig;
}

export default function NotificationWidget({ notifications, loading, fontSizes, widgetStyle }: NotificationWidgetProps) {
  const ws = widgetStyle || {};
  const iconPx = ws.iconSize || 14;

  if (loading) {
    return (
      <div className="widget-card h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="widget-card h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Bell className="h-6 w-6 opacity-40" />
        <span className="text-xs">No notifications</span>
      </div>
    );
  }

  return (
    <div className="widget-card h-full overflow-auto p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell style={{ width: iconPx + 2, height: iconPx + 2, color: ws.iconColor || "hsl(var(--primary))" }} />
        <span
          className="font-semibold uppercase tracking-wider"
          style={{ fontSize: fontSizes?.heading || 12, color: ws.headingColor || "hsl(var(--foreground))" }}
        >
          Notifications
        </span>
        <span className="ml-auto text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
          {notifications.length}
        </span>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => {
          const IconComp = ICON_MAP[n.icon] || Bell;
          return (
            <div
              key={n.id}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-secondary/40 border border-border/30"
            >
              <div
                className="mt-0.5 p-1 rounded-md shrink-0"
                style={{ backgroundColor: `${n.color}20` }}
              >
                <IconComp
                  style={{ width: iconPx, height: iconPx, color: ws.iconColor || n.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate"
                  style={{ fontSize: fontSizes?.body || 13, color: ws.valueColor || "hsl(var(--foreground))" }}
                >
                  {n.title}
                </div>
                <div
                  className="mt-0.5 line-clamp-2"
                  style={{ fontSize: fontSizes?.label || 11, color: ws.labelColor || "hsl(var(--muted-foreground))" }}
                >
                  {n.message}
                </div>
                <div style={{ fontSize: 9, color: ws.labelColor || "hsl(var(--muted-foreground) / 0.5)" }} className="mt-1">
                  {formatTime(n.timestamp)}
                </div>
              </div>
              {n.type === "alert" && (
                <span className="shrink-0 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${n.color}20`, color: n.color }}>
                  Alert
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}