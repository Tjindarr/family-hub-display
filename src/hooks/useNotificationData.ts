import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, type HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { NotificationAlertRule } from "@/lib/config";

export interface NotificationItem {
  id: string;
  type: "ha" | "alert";
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: string;
}

export function useNotificationData(config: DashboardConfig, statesMap?: Map<string, HAState>) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const nc = config.notificationConfig;
    if (!nc) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const isDemo = !checkConfigured(config);

    if (isDemo) {
      const mock: NotificationItem[] = [];
      if (nc.showHANotifications) {
        mock.push({
          id: "demo_1",
          type: "ha",
          title: "Update Available",
          message: "Home Assistant 2025.2 is ready to install",
          icon: "bell",
          color: "hsl(174, 72%, 50%)",
          timestamp: new Date().toISOString(),
        });
        mock.push({
          id: "demo_2",
          type: "ha",
          title: "Low Battery",
          message: "Front door sensor battery is at 5%",
          icon: "battery-low",
          color: "hsl(32, 95%, 55%)",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        });
      }
      if (nc.alertRules?.length) {
        nc.alertRules.forEach((rule, i) => {
          mock.push({
            id: `alert_demo_${i}`,
            type: "alert",
            title: rule.label || "Alert",
            message: `${rule.entityId} is ${rule.condition} ${rule.threshold}`,
            icon: rule.icon || "alert-triangle",
            color: rule.color || "hsl(0, 72%, 55%)",
            timestamp: new Date().toISOString(),
          });
        });
      }
      setNotifications(mock);
      setLoading(false);
      return;
    }

    try {
      const items: NotificationItem[] = [];

      // Fetch HA persistent notifications from cache
      if (nc.showHANotifications) {
        try {
          if (statesMap && statesMap.size > 0) {
            // Use cached states
            for (const [entityId, s] of statesMap) {
              if (entityId.startsWith("persistent_notification.")) {
                items.push({
                  id: s.entity_id,
                  type: "ha",
                  title: s.attributes?.title || s.attributes?.friendly_name || "Notification",
                  message: s.attributes?.message || s.state,
                  icon: "bell",
                  color: "hsl(174, 72%, 50%)",
                  timestamp: s.last_updated || new Date().toISOString(),
                });
              }
            }
          } else {
            // Fallback to individual call
            const client = createHAClient(config);
            const allStates = await client.getStates();
            const notifStates = allStates.filter((s) =>
              s.entity_id.startsWith("persistent_notification.")
            );
            for (const s of notifStates) {
              items.push({
                id: s.entity_id,
                type: "ha",
                title: s.attributes?.title || s.attributes?.friendly_name || "Notification",
                message: s.attributes?.message || s.state,
                icon: "bell",
                color: "hsl(174, 72%, 50%)",
                timestamp: s.last_updated || new Date().toISOString(),
              });
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Check alert rules using cache
      if (nc.alertRules?.length) {
        for (const rule of nc.alertRules) {
          try {
            const state = statesMap?.get(rule.entityId) || await createHAClient(config).getState(rule.entityId);
            const value = parseFloat(state.state);
            if (isNaN(value)) continue;

            let triggered = false;
            if (rule.condition === "above" && value > rule.threshold) triggered = true;
            if (rule.condition === "below" && value < rule.threshold) triggered = true;
            if (rule.condition === "equals" && value === rule.threshold) triggered = true;

            if (triggered) {
              items.push({
                id: `alert_${rule.id}`,
                type: "alert",
                title: rule.label || rule.entityId,
                message: `Value: ${value} (${rule.condition} ${rule.threshold})`,
                icon: rule.icon || "alert-triangle",
                color: rule.color || "hsl(0, 72%, 55%)",
                timestamp: state.last_updated || new Date().toISOString(),
              });
            }
          } catch {
            /* ignore */
          }
        }
      }

      setNotifications(items);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [config, statesMap]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  return { notifications, loading };
}
