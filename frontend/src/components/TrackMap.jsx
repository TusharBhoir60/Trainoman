import { memo, useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        {has && <motion.circle cx={st.x} cy={FAST_LINE_Y} r={11} fill="none" stroke="#00D4FF" strokeWidth={1} opacity={0.3} animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />}
        <circle cx={st.x} cy={SLOW_LINE_Y} r={has ? 7 : 5} fill={has ? "#00D4FF" : "#1A2540"} stroke={has ? "#00D4FF" : "#2A3560"} strokeWidth={1} className="transition-all duration-300" />
      </g>);
    })}
  </g>);
}

function TrainMarker({ train }) {
  const cur = STATION_MAP[train.current_station];
  const nxt = STATION_MAP[train.next_station];
  if (!cur) return null;
  const nxtX = nxt ? nxt.x : cur.x;
  const x = cur.x + (nxtX - cur.x) * (train.segment_pct ?? 0);
  const y = train.line_type === "fast" ? FAST_LINE_Y : SLOW_LINE_Y;
  const isCrit = train.delay_mins > 15;
  const isDel = train.delay_mins > 5;
  const fill = isCrit ? "#FF4444" : isDel ? "#FFB800"
    : train.line_type === "fast" ? "#00D4FF" : "#00FF88";
  const isExp = train.is_express || train.line_type === "fast";
  const pd = isCrit ? 0.8 : isDel ? 1.5 : 0;

  return (
    <g
      data-train-id={train.id}
      transform={`translate(${x}, ${y})`}
      style={{ transition: "transform 0.5s linear" }}
    >
      <motion.g
        animate={pd > 0 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={pd > 0
          ? { duration: pd, repeat: Infinity, ease: "easeInOut" }
          : {}}
      >
        {isExp
          ? <polygon points="-5,-5 5,0 -5,5" fill={fill} />
          : <circle r={5} fill={fill} />
        }
      </motion.g>
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
