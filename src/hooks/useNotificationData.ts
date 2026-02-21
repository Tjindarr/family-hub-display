import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, type HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";
import type { NotificationAlertRule } from "@/lib/config";
import type { GetCachedState, OnStateChange, GetAllStates } from "@/hooks/useDashboardData";

export interface NotificationItem {
  id: string;
  type: "ha" | "alert";
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: string;
}

export function useNotificationData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange,
  getAllStates?: GetAllStates
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const updateFromCache = useCallback(() => {
    const nc = config.notificationConfig;
    if (!nc || !checkConfigured(config)) return;

    const items: NotificationItem[] = [];

    // Persistent notifications from cache
    if (nc.showHANotifications && getAllStates) {
      const allStates = getAllStates();
      for (const s of allStates) {
        if (s.entity_id.startsWith("persistent_notification.")) {
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
    }

    // Alert rules from cache
    if (nc.alertRules?.length && getCachedState) {
      for (const rule of nc.alertRules) {
        const state = getCachedState(rule.entityId);
        if (!state) continue;
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
      }
    }

    setNotifications(items);
    setLoading(false);
  }, [config, getCachedState, getAllStates]);

  const fetchData = useCallback(async () => {
    const nc = config.notificationConfig;
    if (!nc) { setNotifications([]); setLoading(false); return; }

    if (!checkConfigured(config)) {
      const mock: NotificationItem[] = [];
      if (nc.showHANotifications) {
        mock.push({
          id: "demo_1", type: "ha", title: "Update Available",
          message: "Home Assistant 2025.2 is ready to install",
          icon: "bell", color: "hsl(174, 72%, 50%)", timestamp: new Date().toISOString(),
        });
        mock.push({
          id: "demo_2", type: "ha", title: "Low Battery",
          message: "Front door sensor battery is at 5%",
          icon: "battery-low", color: "hsl(32, 95%, 55%)", timestamp: new Date(Date.now() - 3600000).toISOString(),
        });
      }
      if (nc.alertRules?.length) {
        nc.alertRules.forEach((rule, i) => {
          mock.push({
            id: `alert_demo_${i}`, type: "alert", title: rule.label || "Alert",
            message: `${rule.entityId} is ${rule.condition} ${rule.threshold}`,
            icon: rule.icon || "alert-triangle", color: rule.color || "hsl(0, 72%, 55%)",
            timestamp: new Date().toISOString(),
          });
        });
      }
      setNotifications(mock);
      setLoading(false);
      return;
    }

    updateFromCache();
  }, [config, updateFromCache]);

  // WS listener
  useEffect(() => {
    if (!onStateChange || !checkConfigured(config)) return;
    const nc = config.notificationConfig;
    if (!nc) return;

    const alertEntityIds = new Set<string>();
    for (const rule of (nc.alertRules || [])) {
      alertEntityIds.add(rule.entityId);
    }

    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityId.startsWith("persistent_notification.") || alertEntityIds.has(entityId)) {
        updateFromCache();
      }
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { notifications, loading };
}
