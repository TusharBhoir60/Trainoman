import { motion } from "framer-motion";
import {
  Train,
  Play,
  Pause,
  RotateCcw,
  History,
  Download,
  Layers,
} from "lucide-react";
import { formatTime } from "../utils/formatters";

const MOCK_STATE = {
  sim_time: "06:42",
};

export default function TopBar({
  simState,
  isConnected,
  connectionStatus,
  controlSim,
}) {
  const data = simState || MOCK_STATE;
  const isPaused = !simState;
  const simTime = formatTime(data.sim_time);

  return (
    <div className="h-[56px] flex items-center justify-between px-5 border-b border-border-default bg-bg-surface shrink-0">
      {/* ── Left ── */}
      <div className="flex items-center gap-3">
        <Train size={18} className="text-accent-cyan" />
        <span className="text-[15px] font-semibold text-text-primary">
          Mumbai Railway AI
        </span>
        <span className="text-text-muted text-xs">·</span>
        <span className="text-xs text-text-secondary">
          Western Line · Simulation
        </span>
      </div>

      {/* ── Center — AI Status Badge ── */}
      <div className="flex items-center gap-6">
        {/* Multi-line toggle (future) */}
        <DisabledButton icon={<Layers size={14} />} label="Multi-Line" tip="Coming Soon" />

        {isPaused ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-border-default bg-transparent">
            <div className="w-2 h-2 rounded-full bg-text-muted" />
            <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
              Simulation Paused
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-accent-cyan/30 bg-accent-cyan/10">
            <motion.div
              className="w-2 h-2 rounded-full bg-accent-cyan"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 4px #00D4FF)" }}
            />
            <span className="text-xs font-medium tracking-wide text-accent-cyan uppercase">
              AI Agent Active
            </span>
          </div>
        )}
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-5">
        {/* Sim Clock */}
        <div className="flex flex-col items-end">
          <span className="text-xl font-semibold text-accent-cyan font-mono tabular-nums leading-tight">
            {simTime}
          </span>
          <span className="text-[10px] text-text-muted leading-tight">
            Simulation Time
          </span>
        </div>

        {/* Connection indicator */}
        <div className="relative group">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              isConnected
                ? "bg-accent-green"
                : connectionStatus === "connecting"
                ? "bg-accent-amber"
                : "bg-accent-red"
            }`}
            style={
              isConnected
                ? { filter: "drop-shadow(0 0 4px #00FF88)" }
                : connectionStatus === "connecting"
                ? { filter: "drop-shadow(0 0 4px #FFB800)" }
                : {}
            }
          />
          <Tooltip
            text={
              isConnected
                ? "WebSocket · 2Hz"
                : connectionStatus === "connecting"
                ? "Reconnecting..."
                : "Disconnected"
            }
          />
        </div>

        {/* Play / Pause */}
        <GhostButton
          onClick={() => controlSim(isPaused ? "play" : "pause")}
          icon={isPaused ? <Play size={16} /> : <Pause size={16} />}
        />
        {/* Reset */}
        <GhostButton onClick={() => controlSim("reset")} icon={<RotateCcw size={16} />} />

        {/* Future buttons */}
        <DisabledButton icon={<History size={14} />} label="Replay" tip="Replay mode — coming soon" />
        <DisabledButton icon={<Download size={14} />} label="Export" tip="Available after full episode" />
      </div>
    </div>
  );
}

/* ── Helper: ghost button ── */
function GhostButton({ onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors duration-300 cursor-pointer"
    >
      {icon}
    </button>
  );
}

/* ── Helper: disabled future-feature button ── */
function DisabledButton({ icon, label, tip }) {
  return (
    <div className="relative group">
      <button
        disabled
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-text-muted opacity-35 cursor-not-allowed border border-border-default"
      >
        {icon}
        {label}
      </button>
      <Tooltip text={tip} />
    </div>
  );
}

/* ── Helper: tooltip ── */
function Tooltip({ text }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded bg-bg-elevated text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-border-default">
      {text}
    </div>
  );
}
