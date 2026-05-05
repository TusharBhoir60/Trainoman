import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  STATIONS, STATION_MAP, CROSSOVER_STATIONS,
  FAST_LINE_Y, SLOW_LINE_Y, SIGNAL_Y, SVG_VIEWBOX,
} from "../constants/stations";
import { getSignalHex, getSignalLabel } from "../utils/formatters";

const StaticTrackLayer = memo(function StaticTrackLayer() {
  const fX = STATIONS[0].x, lX = STATIONS[STATIONS.length - 1].x;
  return (
    <g>
      <defs>
        <linearGradient id="trackOv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,212,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,212,255,0)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="760" height="200" fill="url(#trackOv)" />
      <line x1={fX} y1={FAST_LINE_Y} x2={lX} y2={FAST_LINE_Y} stroke="#1A2540" strokeWidth={3} />
      <line x1={fX} y1={SLOW_LINE_Y} x2={lX} y2={SLOW_LINE_Y} stroke="#1A2540" strokeWidth={3} />
      {Array.from({ length: 9 }).map((_, i) => {
        const ax = fX + 20 + i * 80;
        if (ax > lX - 20) return null;
        return (<g key={i}>
          <text x={ax} y={FAST_LINE_Y} fill="rgba(255,255,255,0.05)" fontSize={8} textAnchor="middle" dominantBaseline="central">▶</text>
          <text x={ax} y={SLOW_LINE_Y} fill="rgba(255,255,255,0.05)" fontSize={8} textAnchor="middle" dominantBaseline="central">▶</text>
        </g>);
      })}
      {CROSSOVER_STATIONS.map(sid => {
        const s = STATION_MAP[sid]; if (!s) return null;
        return (<g key={`xo-${sid}`}>
          <line x1={s.x} y1={FAST_LINE_Y} x2={s.x} y2={SLOW_LINE_Y} stroke="rgba(255,184,0,0.4)" strokeWidth={1} strokeDasharray="3 2" />
          <text x={s.x} y={(FAST_LINE_Y + SLOW_LINE_Y) / 2} fill="#FFB800" fontSize={9} textAnchor="middle" dominantBaseline="central" fontWeight={500}>XO</text>
        </g>);
      })}
      {STATIONS.map(s => (
        <text key={s.id} x={s.x} y={SLOW_LINE_Y + 24} fill="#3D4666" fontSize={9} textAnchor="middle" fontFamily="Inter,sans-serif">{s.short}</text>
      ))}
    </g>
  );
});

/** Pulsing ring at station — uses SVG-native r attribute animation via ref */
function StationPulseRing({ cx, cy }) {
  const ringRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const baseR = 11;
    const maxR = 14.3; // 11 * 1.3
    const duration = 2000;
    const startTime = performance.now();

    const tick = (now) => {
      const t = ((now - startTime) % duration) / duration;
      // Sinusoidal ease: 0→1→0
      const ease = 0.5 - 0.5 * Math.cos(t * 2 * Math.PI);
      const r = baseR + (maxR - baseR) * ease;
      const opacity = 0.3 - 0.2 * ease;
      if (ringRef.current) {
        ringRef.current.setAttribute("r", r);
        ringRef.current.setAttribute("opacity", opacity);
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <circle ref={ringRef} cx={cx} cy={cy} r={11} fill="none" stroke="#00D4FF" strokeWidth={1} opacity={0.3} />
  );
}

function StationNodes({ signals, trainsAtStation, onHover }) {
  const sigMap = useMemo(() => {
    const m = {}; if (signals) signals.forEach(s => m[s.station_id] = s); return m;
  }, [signals]);

  return (<g>
    {STATIONS.map(st => {
      const sig = sigMap[st.id];
      const sigCol = sig ? getSignalHex(sig.color) : "#3D4666";
      const has = trainsAtStation[st.id]?.length > 0;
      return (<g key={st.id} onMouseEnter={() => onHover(st.id)} onMouseLeave={() => onHover(null)} style={{ cursor: "pointer" }}>
        <circle cx={st.x} cy={SIGNAL_Y} r={4} fill={sigCol} className={sig?.color === "R" ? "signal-glow-R" : sig?.color === "Y" ? "signal-glow-Y" : sig?.color === "G" ? "signal-glow-G" : ""}>
          <title>{st.name} · {sig ? getSignalLabel(sig.color) : "NO DATA"}{sig?.last_decision ? ` · ${sig.last_decision}` : ""}</title>
        </circle>
        <circle cx={st.x} cy={FAST_LINE_Y} r={has ? 7 : 5} fill={has ? "#00D4FF" : "#1A2540"} stroke={has ? "#00D4FF" : "#2A3560"} strokeWidth={1} className="transition-all duration-300" />
        {has && <StationPulseRing cx={st.x} cy={FAST_LINE_Y} />}
        <circle cx={st.x} cy={SLOW_LINE_Y} r={has ? 7 : 5} fill={has ? "#00D4FF" : "#1A2540"} stroke={has ? "#00D4FF" : "#2A3560"} strokeWidth={1} className="transition-all duration-300" />
      </g>);
    })}
  </g>);
}

/**
 * TrainMarker — positions trains via SVG `transform` attribute directly,
 * animated with Framer Motion useSpring + ref for cross-browser SVG compat.
 * CSS transforms on SVG <g> elements are ignored in Safari / Firefox.
 */
function TrainMarker({ train }) {
  const cur = STATION_MAP[train.current_station];
  const nxt = STATION_MAP[train.next_station];
  if (!cur) return null;
  const nxtX = nxt ? nxt.x : cur.x;
  const targetX = cur.x + (nxtX - cur.x) * (train.segment_pct ?? 0);
  const targetY = train.line_type === "fast" ? FAST_LINE_Y : SLOW_LINE_Y;
  const isCrit = train.delay_mins > 15;
  const isDel = train.delay_mins > 5;
  const fill = isCrit ? "#FF4444" : isDel ? "#FFB800"
    : train.line_type === "fast" ? "#00D4FF" : "#00FF88";
  const isExp = train.is_express || train.line_type === "fast";
  const pd = isCrit ? 0.8 : isDel ? 1.5 : 0;

  // --- SVG-native position animation via spring + direct attribute writes ---
  const groupRef = useRef(null);
  const mvX = useMotionValue(targetX);
  const mvY = useMotionValue(targetY);
  const springX = useSpring(mvX, { stiffness: 120, damping: 28 });
  const springY = useSpring(mvY, { stiffness: 120, damping: 28 });

  // Push new targets into motion values when they change
  useEffect(() => { mvX.set(targetX); }, [targetX]);
  useEffect(() => { mvY.set(targetY); }, [targetY]);

  // Subscribe to spring updates and write directly to the SVG transform attribute
  useEffect(() => {
    const updateTransform = () => {
      if (groupRef.current) {
        groupRef.current.setAttribute(
          "transform",
          `translate(${springX.get()}, ${springY.get()})`
        );
      }
    };
    const unsubX = springX.on("change", updateTransform);
    const unsubY = springY.on("change", updateTransform);
    // Set initial position immediately
    updateTransform();
    return () => { unsubX(); unsubY(); };
  }, [springX, springY]);

  // --- SVG-native scale pulse for delayed trains ---
  const pulseRef = useRef(null);
  const pulseAnimRef = useRef(null);

  useEffect(() => {
    if (pd <= 0) {
      // Reset to identity scale if not delayed
      if (pulseRef.current) {
        pulseRef.current.setAttribute("transform", "scale(1)");
      }
      return;
    }

    const durationMs = pd * 1000;
    const startTime = performance.now();

    const tick = (now) => {
      const t = ((now - startTime) % durationMs) / durationMs;
      const ease = 0.5 - 0.5 * Math.cos(t * 2 * Math.PI);
      const scale = 1 + 0.2 * ease; // 1 → 1.2 → 1
      if (pulseRef.current) {
        pulseRef.current.setAttribute("transform", `scale(${scale})`);
      }
      pulseAnimRef.current = requestAnimationFrame(tick);
    };

    pulseAnimRef.current = requestAnimationFrame(tick);
    return () => { if (pulseAnimRef.current) cancelAnimationFrame(pulseAnimRef.current); };
  }, [pd]);

  return (
    <g
      ref={groupRef}
      data-train-id={train.id}
      transform={`translate(${targetX}, ${targetY})`}
    >
      <g ref={pulseRef}>
        {isExp
          ? <polygon points="-5,-5 5,0 -5,5" fill={fill} />
          : <circle r={5} fill={fill} />
        }
      </g>
      <title>
        {train.id} · {train.line_type}
        {train.delay_mins > 0 ? ` · +${train.delay_mins.toFixed(1)}m` : ""}
      </title>
    </g>
  );
}

function TrackMap({ trains, signals, highlightedTrainId }) {
  const tl = trains || [], sl = signals || [];
  const [hov, setHov] = useState(null);
  const tas = useMemo(() => {
    const m = {};
    tl.forEach(t => { if (t.is_at_platform && t.current_station) { if (!m[t.current_station]) m[t.current_station] = []; m[t.current_station].push(t); }});
    return m;
  }, [tl]);

  return (
    <div className="h-[320px] w-full px-5 shrink-0">
      <div className="h-full w-full bg-bg-base rounded-lg border border-border-default overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <svg viewBox={SVG_VIEWBOX} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <StaticTrackLayer />
          <StationNodes signals={sl} trainsAtStation={tas} onHover={setHov} />
          {tl.map(t => <TrainMarker key={t.id} train={t} />)}
        </svg>
      </div>
    </div>
  );
}

export default memo(TrackMap);
