import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSignalHex, getSignalLabel } from "../utils/formatters";

const FILTERS = ["ALL", "DELAYED", "EXPRESS"];

function DecisionLog({ signals, trains, onLocateTrain }) {
  const [filter, setFilter] = useState("ALL");

  // Build decision entries from signals + correlated train data
  const entries = useMemo(() => {
    if (!signals || signals.length === 0) return [];
    return signals
      .map((sig) => {
        const stationTrains = trains?.filter(
          (t) => t.current_station === sig.station_id || t.next_station === sig.station_id
        ) || [];
        const maxDelay = stationTrains.reduce((mx, t) => Math.max(mx, t.delay_mins || 0), 0);
        const hasExpress = stationTrains.some((t) => t.is_express || t.line_type === "fast");
        return {
          station_id: sig.station_id,
          color: sig.color,
          decision: sig.last_decision || `${getSignalLabel(sig.color)} ${sig.color === "G" ? "FAST" : sig.color === "Y" ? "SLOW" : "HOLD"}`,
          delay: maxDelay,
          hasExpress,
          trainIds: stationTrains.map((t) => t.id),
        };
      })
      .filter((e) => {
        if (filter === "ALL") return true;
        if (filter === "DELAYED") return e.delay > 0;
        if (filter === "EXPRESS") return e.hasExpress;
        return true;
      })
      .slice(0, 25);
  }, [signals, trains, filter]);

  const borderColor = (c) => c === "G" ? "#00FF88" : c === "Y" ? "#FFB800" : "#FF4444";

  return (
    <div className="flex-1 flex flex-col bg-bg-surface border border-border-default rounded-lg overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">AI Decision Log</span>
          <motion.div
            className="w-2 h-2 rounded-full bg-accent-green"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: "drop-shadow(0 0 4px #00FF88)" }}
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors duration-300 border ${
                filter === f
                  ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
                  : "bg-transparent border-border-default text-text-muted hover:text-text-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable entries */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Waiting for simulation...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => (
              <motion.div
                key={`${entry.station_id}-${i}`}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="group relative mb-1.5 px-3 py-2.5 rounded hover:bg-white/[0.02] transition-colors duration-300"
                style={{ borderLeft: `3px solid ${borderColor(entry.color)}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">●</span>
                    <span className="text-[13px] font-medium text-text-primary truncate">
                      {entry.station_id}
                    </span>
                  </div>
                  {entry.delay > 0 && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        color: entry.delay > 5 ? "#FF4444" : "#FFB800",
                        backgroundColor: entry.delay > 5 ? "rgba(255,68,68,0.1)" : "rgba(255,184,0,0.1)",
                      }}
                    >
                      +{entry.delay.toFixed(1)} min
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary mt-0.5 truncate">
                  → {entry.decision}
                </div>
                {/* Locate on map button */}
                {entry.trainIds.length > 0 && onLocateTrain && (
                  <button
                    onClick={() => onLocateTrain(entry.trainIds[0])}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  >
                    → Locate
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default memo(DecisionLog);
