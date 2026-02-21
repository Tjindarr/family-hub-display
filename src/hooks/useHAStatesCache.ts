import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardConfig, isConfigured, HAState } from "@/lib/config";
import { createHAClient } from "@/lib/ha-api";

/**
 * Centralized bulk /api/states fetcher.
 * Fetches ALL states once per refresh cycle so individual widgets
 * don't need to call /api/states/{entity_id} separately.
 */
export function useHAStatesCache(config: DashboardConfig) {
  const [loading, setLoading] = useState(true);
  const statesMapRef = useRef<Map<string, HAState>>(new Map());

  const fetchStates = useCallback(async () => {
    if (!isConfigured(config)) {
      statesMapRef.current = new Map();
      setLoading(false);
      return;
    }

    try {
      const client = createHAClient(config);
      const allStates = await client.getStates();
      const map = new Map<string, HAState>();
      for (const state of allStates) {
        map.set(state.entity_id, state);
      }
      statesMapRef.current = map;
    } catch (err) {
      console.error("Failed to fetch bulk states:", err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchStates();
    const interval = setInterval(fetchStates, config.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchStates, config.refreshInterval]);

  /** Synchronous lookup from cache */
  const getState = useCallback((entityId: string): HAState | undefined => {
    return statesMapRef.current.get(entityId);
  }, []);

  return { getState, loading };
}
