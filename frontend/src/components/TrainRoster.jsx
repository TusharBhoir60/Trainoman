import { memo, useMemo, useState } from "react";
import { STATION_MAP } from "../constants/stations";
import { getDelayHex } from "../utils/formatters";

const COLS = [
  { key: "id", label: "Train ID" },
  { key: "status", label: "Status" },
  { key: "line_type", label: "Line" },
  { key: "station", label: "Station" },
  { key: "delay_mins", label: "Delay" },
];

function getStatus(t) {
  if (t.delay_mins > 10) return "CRITICAL";
  if (t.delay_mins > 2) return "DELAYED";
  if (t.is_at_platform) return "AT PLATFORM";
  return "EN ROUTE";
}

const STATUS_STYLES = {
  "EN ROUTE":    { bg: "rgba(0,212,255,0.1)", color: "#00D4FF" },
  "AT PLATFORM": { bg: "rgba(0,255,136,0.1)", color: "#00FF88" },
  "DELAYED":     { bg: "rgba(255,184,0,0.1)", color: "#FFB800" },
  "CRITICAL":    { bg: "rgba(255,68,68,0.1)",  color: "#FF4444" },
  "HELD":        { bg: "rgba(61,70,102,0.2)",  color: "#6B7A99" },
};

function TrainRoster({ trains, onSelectTrain }) {
  const [sortKey, setSortKey] = useState("delay_mins");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    if (!trains || trains.length === 0) return [];
    const copy = [...trains];
    copy.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "station") { av = a.current_station; bv = b.current_station; }
      if (sortKey === "status") { av = getStatus(a); bv = getStatus(b); }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av ?? 0) - (bv ?? 0) : (bv ?? 0) - (av ?? 0);
    });
    return copy;
  }, [trains, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const maxDelay = useMemo(() => {
    if (!sorted.length) return 0;
    return Math.max(...sorted.map((t) => t.delay_mins || 0));
  }, [sorted]);

  return (
    <div className="flex-1 flex flex-col bg-bg-surface border border-border-default rounded-lg overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <span className="text-sm font-semibold text-text-primary">Live Train Roster</span>
        <span className="text-[11px] text-text-muted bg-bg-base px-2 py-0.5 rounded-sm border border-border-default tabular-nums">
          {trains?.length ?? 0} trains
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-surface z-10">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium cursor-pointer hover:text-text-secondary transition-colors duration-300 select-none"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-accent-cyan">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted">
                  Waiting for simulation...
                </td>
              </tr>
            ) : (
              sorted.map((train) => {
                const status = getStatus(train);
                const st = STATUS_STYLES[status] || STATUS_STYLES["EN ROUTE"];
                const isMostDelayed = train.delay_mins === maxDelay && maxDelay > 5;

                return (
                  <tr
                    key={train.id}
                    onClick={() => onSelectTrain?.(train.id)}
                    className="hover:bg-white/[0.02] transition-colors duration-300 cursor-pointer"
                    style={isMostDelayed ? { borderLeft: "2px solid #FF4444" } : {}}
                  >
                    {/* Train ID */}
                    <td className="px-3 py-2.5">
                      <span
                        className="font-mono tabular-nums font-medium"
                        style={{ color: train.is_express || train.line_type === "fast" ? "#00D4FF" : "#E8EDF5" }}
                      >
                        {train.id}
                      </span>
                    </td>

                    {/* Status pill */}
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wide"
                        style={{ backgroundColor: st.bg, color: st.color }}
                      >
                        {status}
                      </span>
                    </td>

                    {/* Line */}
                    <td className="px-3 py-2.5">
                      <span style={{ color: train.line_type === "fast" ? "#00D4FF" : "#6B7A99" }} className="uppercase text-[11px] font-medium">
                        {train.line_type || "—"}
                      </span>
                    </td>

                    {/* Station */}
                    <td className="px-3 py-2.5 text-text-secondary">
                      {train.current_station}
                      <span className="text-text-muted mx-1">→</span>
                      {train.next_station || "—"}
                    </td>

                    {/* Delay */}
                    <td className="px-3 py-2.5 tabular-nums font-medium" style={{ color: getDelayHex(train.delay_mins) }}>
                      {train.delay_mins <= 0 ? "On time" : `+${Number(train.delay_mins).toFixed(1)} min`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(TrainRoster);
