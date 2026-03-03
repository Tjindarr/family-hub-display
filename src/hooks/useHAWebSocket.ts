import { useEffect, useCallback, useRef, useState } from "react";
import { DashboardConfig, HAState } from "@/lib/config";

type WSState = "connecting" | "connected" | "disconnected";

interface ServerMessage {
  type: string;
  state?: string; // for ha_connection
  states?: HAState[]; // for ha_states_bulk
  entity_id?: string; // for ha_state_changed / ha_state_removed
}

/**
 * WebSocket connection to the server's HA proxy relay.
 * The server maintains the actual HA WebSocket connection and relays
 * state changes to all connected browser clients.
 * This eliminates CORS/tunnel issues and keeps the HA token server-side.
 */
export function useHAWebSocket(config: DashboardConfig) {
  const [wsState, setWsState] = useState<WSState>("disconnected");
  const statesMapRef = useRef<Map<string, HAState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectDelay = 30000;

  // Track listeners for state changes
  const listenersRef = useRef<Set<(entityId: string, state: HAState) => void>>(new Set());

  const getWsUrl = useCallback((): string => {
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${loc.host}/ws`;
  }, []);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWsUrl();
    console.log("[WS Relay] Connecting to", wsUrl);
    setWsState("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS Relay] Connected to server");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.warn("[WS Relay] Failed to parse message:", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("[WS Relay] WebSocket error:", err);
      };

      ws.onclose = () => {
        console.log("[WS Relay] Connection closed");
        setWsState("disconnected");
        wsRef.current = null;
        scheduleReconnect();
      };
    } catch (err) {
      console.error("[WS Relay] Failed to create WebSocket:", err);
      setWsState("disconnected");
      scheduleReconnect();
    }
  }, []);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "ha_connection":
        if (msg.state === "connected") {
          setWsState("connected");
        } else if (msg.state === "connecting") {
          setWsState("connecting");
        } else {
          setWsState("disconnected");
        }
        break;

      case "ha_states_bulk":
        if (Array.isArray(msg.states)) {
          const map = new Map<string, HAState>();
          for (const state of msg.states) {
            map.set(state.entity_id, state);
          }
          statesMapRef.current = map;
          console.log(`[WS Relay] Loaded ${map.size} states`);
          // Notify listeners with bulk-load signal
          for (const listener of listenersRef.current) {
            try { listener("__bulk_load__", {} as HAState); } catch {}
          }
        }
        break;

      case "ha_state_changed":
        if (msg.entity_id && (msg as any).state) {
          const newState = (msg as any).state as HAState;
          statesMapRef.current.set(msg.entity_id, newState);
          for (const listener of listenersRef.current) {
            try { listener(msg.entity_id, newState); } catch {}
          }
        }
        break;

      case "ha_state_removed":
        if (msg.entity_id) {
          statesMapRef.current.delete(msg.entity_id);
        }
        break;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    const attempts = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempts), maxReconnectDelay);
    reconnectAttemptsRef.current = attempts + 1;
    console.log(`[WS Relay] Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
    reconnectTimeoutRef.current = setTimeout(connect, delay);
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  /** Synchronous lookup from cache */
  const getState = useCallback((entityId: string): HAState | undefined => {
    return statesMapRef.current.get(entityId);
  }, []);

  /** Get all states */
  const getAllStates = useCallback((): HAState[] => {
    return Array.from(statesMapRef.current.values());
  }, []);

  /** Subscribe to state changes */
  const onStateChange = useCallback((callback: (entityId: string, state: HAState) => void) => {
    listenersRef.current.add(callback);
    return () => { listenersRef.current.delete(callback); };
  }, []);

  return {
    wsState,
    getState,
    getAllStates,
    onStateChange,
    isConnected: wsState === "connected",
  };
}
