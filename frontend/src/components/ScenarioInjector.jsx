import { memo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Zap, X, TrendingUp, Users, AlertTriangle } from "lucide-react";

const SCENARIOS = [
  { type: "train_breakdown", icon: Zap,        label: "Train Breakdown",  sub: "Freeze 1 train · 4 min", params: {} },
  { type: "platform_block",  icon: X,           label: "Platform Block",   sub: "Block Dadar P2 · 3 min", params: { station: "DDR", platform: 2 } },
  { type: "upstream_delay",  icon: TrendingUp,  label: "Upstream Delay",   sub: "+5 min cascade ← demo",  params: { delay: 5 }, recommended: true },
  { type: "rush_hour",       icon: Users,       label: "Rush Hour",        sub: "2× passenger load",      params: { multiplier: 2 } },
];

function ScenarioInjector({ injectScenario }) {
  const [active, setActive] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [recovered, setRecovered] = useState(false);
  const timerRef = useRef(null);

  const handleInject = (scenario) => {
    if (active) return;
    setActive(scenario.type);
    setRecovered(false);

    // Simulate countdown (cosmetic — real timing from backend)
    const duration = scenario.type === "train_breakdown" ? 240 : scenario.type === "platform_block" ? 180 : 300;
    setCountdown(duration);

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setRecovered(true);
          setTimeout(() => { setActive(null); setRecovered(false); }, 3000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    injectScenario?.(scenario.type, scenario.params);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="h-[80px] flex items-center gap-6 px-5 bg-bg-surface border-t border-border-default shrink-0">
      {/* Label */}
      <div className="flex items-center gap-2 shrink-0">
        <AlertTriangle size={14} className="text-accent-amber" />
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium">
          Inject Scenario
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 flex-1">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isActive = active === sc.type;
          const isDisabled = active && !isActive;

          return (
            <motion.button
              key={sc.type}
              onClick={() => handleInject(sc)}
              disabled={!!isDisabled}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-colors duration-300 cursor-pointer ${
                isActive
                  ? "border-accent-amber bg-accent-amber/[0.08]"
                  : isDisabled
                  ? "border-border-default bg-transparent opacity-40 pointer-events-none"
                  : "border-white/[0.08] bg-transparent hover:bg-white/[0.04]"
              }`}
              style={
                sc.recommended && !active
                  ? { borderColor: "rgba(0,212,255,0.3)" }
                  : {}
              }
              animate={
                sc.recommended && !active
                  ? { borderColor: ["rgba(0,212,255,0.15)", "rgba(0,212,255,0.4)", "rgba(0,212,255,0.15)"] }
                  : {}
              }
              transition={
                sc.recommended && !active
                  ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            >
              <Icon size={14} className={isActive ? "text-accent-amber" : "text-text-secondary"} />
              <div className="text-left">
                <div className={`text-xs font-medium ${isActive ? "text-accent-amber" : "text-text-primary"}`}>
                  {sc.label}
                </div>
                <div className="text-[10px] text-text-muted">{sc.sub}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Active state indicator */}
      {active && (
        <div className="flex items-center gap-3 shrink-0">
          {!recovered ? (
            <>
              <span className="font-mono text-sm text-accent-amber tabular-nums">
                Active: {fmtTime(countdown)}
              </span>
              <motion.div
                className="w-3 h-3 border-2 border-accent-amber border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-[11px] text-accent-amber font-medium">RECOVERING...</span>
            </>
          ) : (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[11px] text-accent-green font-medium"
            >
              ✓ RECOVERED
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ScenarioInjector);
