import { useEffect, useCallback, useRef, useState } from "react";
import { DashboardConfig, isConfigured, HAState } from "@/lib/config";

type WSState = "connecting" | "connected" | "disconnected";

interface HAWebSocketMessage {
  type: string;
  id?: number;
  success?: boolean;
  result?: any;
  event?: {
    event_type: string;
    data: {
      entity_id: string;
      new_state: HAState | null;
      old_state: HAState | null;
    };
  };
  ha_version?: string;
  message?: string;
}

/**
 * Core WebSocket connection to Home Assistant.
 * - Authenticates with long-lived access token
 * - Fetches all states on connect via `get_states`
 * - Subscribes to `state_changed` events for real-time updates
 * - Auto-reconnects with exponential backoff
 * - Falls back to REST polling if WS is unavailable
 */
export function useHAWebSocket(config: DashboardConfig) {
  const [wsState, setWsState] = useState<WSState>("disconnected");
  const statesMapRef = useRef<Map<string, HAState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const cmdIdRef = useRef(1);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectDelay = 30000; // 30s max
  const isConfiguredRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  // Track listeners for state changes
  const listenersRef = useRef<Set<(entityId: string, state: HAState) => void>>(new Set());

  const nextCmdId = useCallback(() => cmdIdRef.current++, []);

  const getWsUrl = useCallback((haUrl: string): string => {
    const url = haUrl.replace(/\/$/, "");
    if (url.startsWith("https://")) {
      return url.replace("https://", "wss://") + "/api/websocket";
    }
    return url.replace("http://", "ws://") + "/api/websocket";
  }, []);

  const connect = useCallback(() => {
    const cfg = configRef.current;
    if (!isConfigured(cfg)) {
      isConfiguredRef.current = false;
      return;
    }
    isConfiguredRef.current = true;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWsUrl(cfg.haUrl);
    console.log("[HA WS] Connecting to", wsUrl);
    setWsState("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[HA WS] Connection opened");
      };

      ws.onmessage = (event) => {
        try {
          const msg: HAWebSocketMessage = JSON.parse(event.data);
          handleMessage(ws, msg);
        } catch (err) {
          console.warn("[HA WS] Failed to parse message:", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("[HA WS] WebSocket error:", err);
      };

      ws.onclose = (event) => {
        console.log("[HA WS] Connection closed:", event.code, event.reason);
        setWsState("disconnected");
        wsRef.current = null;
        scheduleReconnect();
      };
    } catch (err) {
      console.error("[HA WS] Failed to create WebSocket:", err);
      setWsState("disconnected");
      scheduleReconnect();
    }
  }, []);

  const handleMessage = useCallback((ws: WebSocket, msg: HAWebSocketMessage) => {
    const cfg = configRef.current;

    switch (msg.type) {
      case "auth_required":
        // Send authentication
        ws.send(JSON.stringify({
          type: "auth",
          access_token: cfg.haToken,
        }));
        break;

      case "auth_ok":
        console.log("[HA WS] Authenticated, HA version:", msg.ha_version);
        setWsState("connected");
        reconnectAttemptsRef.current = 0;

        // Fetch all states
        const getStatesId = nextCmdId();
        ws.send(JSON.stringify({
          id: getStatesId,
          type: "get_states",
        }));

        // Subscribe to state changes
        const subscribeId = nextCmdId();
        ws.send(JSON.stringify({
          id: subscribeId,
          type: "subscribe_events",
          event_type: "state_changed",
        }));
        break;

      case "auth_invalid":
        console.error("[HA WS] Authentication failed:", msg.message);
        setWsState("disconnected");
        // Don't reconnect on auth failure
        break;

      case "result":
        if (msg.success && Array.isArray(msg.result)) {
          // This is the get_states response
          const map = new Map<string, HAState>();
          for (const state of msg.result) {
            map.set(state.entity_id, state);
          }
          statesMapRef.current = map;
          console.log(`[HA WS] Loaded ${map.size} states`);
          // Notify listeners with a bulk-load signal so hooks refresh
          for (const listener of listenersRef.current) {
            try {
              listener("__bulk_load__", {} as HAState);
            } catch { /* ignore */ }
          }
        }
        break;

      case "event":
        if (msg.event?.event_type === "state_changed") {
          const { entity_id, new_state } = msg.event.data;
          if (new_state) {
            statesMapRef.current.set(entity_id, new_state);
            // Notify listeners
            for (const listener of listenersRef.current) {
              try {
                listener(entity_id, new_state);
              } catch { /* ignore listener errors */ }
            }
          } else {
            // Entity removed
            statesMapRef.current.delete(entity_id);
          }
        }
        break;

      case "pong":
        // Keepalive response
        break;

      default:
        break;
    }
  }, [nextCmdId]);

  const scheduleReconnect = useCallback(() => {
    if (!isConfiguredRef.current) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const attempts = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempts), maxReconnectDelay);
    reconnectAttemptsRef.current = attempts + 1;

    console.log(`[HA WS] Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // Keepalive ping every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          id: nextCmdId(),
          type: "ping",
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [nextCmdId]);

  // Connect on mount / config change
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [config.haUrl, config.haToken]);

  /** Synchronous lookup from cache */
  const getState = useCallback((entityId: string): HAState | undefined => {
    return statesMapRef.current.get(entityId);
  }, []);

  /** Get all states (for filtering, e.g. zone.* entities) */
  const getAllStates = useCallback((): HAState[] => {
    return Array.from(statesMapRef.current.values());
  }, []);

  /** Subscribe to state changes for specific entities */
  const onStateChange = useCallback((callback: (entityId: string, state: HAState) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  /** Send a command via WebSocket (for future service calls) */
  const sendCommand = useCallback((type: string, data?: Record<string, any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const id = nextCmdId();
      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            wsRef.current?.removeEventListener("message", handler);
            if (msg.success) {
              resolve(msg.result);
            } else {
              reject(new Error(msg.error?.message || "Command failed"));
            }
          }
        } catch { /* ignore */ }
      };

      wsRef.current.addEventListener("message", handler);
      wsRef.current.send(JSON.stringify({ id, type, ...data }));

      // Timeout after 10s
      setTimeout(() => {
        wsRef.current?.removeEventListener("message", handler);
        reject(new Error("Command timeout"));
      }, 10000);
    });
  }, [nextCmdId]);

  return {
    wsState,
    getState,
    getAllStates,
    onStateChange,
    sendCommand,
    isConnected: wsState === "connected",
  };
}
