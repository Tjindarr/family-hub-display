import type { DashboardConfig } from "./config-types";
import { DEFAULT_CONFIG } from "./config-defaults";

export function loadConfig(): DashboardConfig {
  try {
    const stored = localStorage.getItem("ha-dashboard-config");
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load config:", e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: DashboardConfig): void {
  localStorage.setItem("ha-dashboard-config", JSON.stringify(config));
}

/**
 * Load config from the built-in backend API or an external REST backend.
 * If backendUrl is provided, uses that; otherwise uses relative /api/config.
 */
export async function loadRemoteConfig(backendUrl?: string): Promise<DashboardConfig | null> {
  try {
    const url = backendUrl ? `${backendUrl.replace(/\/$/, "")}/config` : "/api/config";
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return { ...DEFAULT_CONFIG, ...data };
  } catch (e) {
    console.error("Failed to load remote config:", e);
    return null;
  }
}

/**
 * Save config to the built-in backend API or an external REST backend.
 */
export async function saveRemoteConfig(backendUrl: string | undefined, config: DashboardConfig): Promise<boolean> {
  try {
    const url = backendUrl ? `${backendUrl.replace(/\/$/, "")}/config` : "/api/config";
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save remote config:", e);
    return false;
  }
}

export function isConfigured(config: DashboardConfig): boolean {
  return config.haUrl.length > 0 && config.haToken.length > 0;
}
