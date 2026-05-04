import { useState, useEffect, useRef, useReducer, useCallback } from "react";

const API_BASE = "http://localhost:8000";

const ringReducer = (state, action) => {
  if (action.type !== "ADD") return state;
  const next = [...state, { tick: action.tick, delay: action.delay, baseline: 18.0 }];
  return next.length > 120 ? next.slice(-120) : next;
};

export default function useSimulation() {
  const [simState, setSimState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [delayHistory, dispatch] = useReducer(ringReducer, []);

  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket("ws://localhost:8000/ws/state");

    ws.onopen = () => setIsConnected(true);

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000); // reconnect after 3s
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setSimState(data);
        dispatch({
          type: "ADD",
          delay: data.metrics?.total_delay_mins ?? 0,
          tick: data.tick,
        });
      } catch (err) {
        console.error("[useSimulation] Failed to parse WS message:", err);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
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

  const connectionStatus = isConnected ? "connected" : "disconnected";

  return {
    simState,
    isConnected,
    connectionStatus,
    delayHistory,
    controlSim,
    injectScenario,
  };
}
