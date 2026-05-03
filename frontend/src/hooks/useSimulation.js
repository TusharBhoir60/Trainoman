import { useState, useEffect, useRef, useReducer, useCallback } from "react";

const WS_URL = "ws://localhost:8000/ws/state";
const API_BASE = "http://localhost:8000";
const MAX_HISTORY = 120;
const BASELINE = 18.0;

// Ring-buffer reducer — avoids spreading a 120-item array every tick
function historyReducer(state, action) {
  switch (action.type) {
    case "APPEND": {
      const next = [...state, action.payload];
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    }
    case "RESET":
      return [];
    default:
      return state;
  }
}

export default function useSimulation() {
  const [simState, setSimState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // "connected" | "connecting" | "disconnected"
  const [delayHistory, dispatchHistory] = useReducer(historyReducer, []);

  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const retryDelayRef = useRef(1000);

  // ---------- WebSocket lifecycle ----------
  const connect = useCallback(() => {
    setConnectionStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("connected");
      retryDelayRef.current = 1000; // reset backoff
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSimState(data);

        dispatchHistory({
          type: "APPEND",
          payload: {
            tick: data.tick,
            delay: data.metrics?.total_delay_mins ?? 0,
            baseline: BASELINE,
          },
        });
      } catch (err) {
        console.error("[useSimulation] Failed to parse WS message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus("disconnected");
      wsRef.current = null;

      // Exponential backoff: 1s → 2s → 4s → 8s max
      const delay = retryDelayRef.current;
      retryRef.current = setTimeout(() => {
        retryDelayRef.current = Math.min(delay * 2, 8000);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnection is handled there
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  // ---------- REST helpers ----------
  const controlSim = useCallback(async (action) => {
    try {
      await fetch(`${API_BASE}/api/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error("[useSimulation] controlSim failed:", e);
    }
  }, []);

  const injectScenario = useCallback(async (type, params = {}) => {
    try {
      await fetch(`${API_BASE}/api/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, params }),
      });
    } catch (e) {
      console.error("[useSimulation] injectScenario failed:", e);
    }
  }, []);

  return {
    simState,
    isConnected,
    connectionStatus,
    delayHistory,
    controlSim,
    injectScenario,
  };
}
