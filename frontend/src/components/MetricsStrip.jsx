import { memo, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Clock, Activity, TrainFront, ShieldCheck } from "lucide-react";
import { getDelayHex, getOnTimePctHex } from "../utils/formatters";

const MOCK_METRICS = {
  total_delay_mins: 0,
  on_time_pct: 100,
  active_trains: 0,
  cascades_prevented: 0,
};

function MetricsStrip({ metrics, delayHistory }) {
  const m = metrics || MOCK_METRICS;
  const isEmpty = !metrics;

  const delayColor = getDelayHex(m.total_delay_mins);
  const otpColor = getOnTimePctHex(m.on_time_pct);

  return (
    <div className="h-[88px] flex gap-3 px-5 py-3 shrink-0">
      {/* Card 1 — Total Delay */}
      <MetricCard
        icon={<Clock size={14} />}
        label="Total Delay"
        value={isEmpty ? "--" : `${Number(m.total_delay_mins).toFixed(1)} min`}
        color={delayColor}
      />

      {/* Card 2 — On-Time % */}
      <MetricCard
        icon={<Activity size={14} />}
        label="On-Time %"
        value={isEmpty ? "--" : `${Number(m.on_time_pct).toFixed(1)}%`}
        color={otpColor}
        extra={<OtpGauge pct={m.on_time_pct} color={otpColor} />}
      />

      {/* Card 3 — Active Trains */}
      <MetricCard
        icon={<TrainFront size={14} />}
        label="Active Trains"
        value={isEmpty ? "--" : m.active_trains}
        color="#00D4FF"
        sub="of 30 scheduled"
      />

      {/* Card 4 — Cascades Prevented */}
      <MetricCard
        icon={<ShieldCheck size={14} />}
        label="Cascades Prevented"
        value={isEmpty ? "--" : m.cascades_prevented}
        color="#00FF88"
      />

      {/* Sparkline */}
      <DelaySparkline data={delayHistory} />
    </div>
  );
}

export default memo(MetricsStrip);

/* ─── KPI Card ─── */
function MetricCard({ icon, label, value, color, sub, extra }) {
  return (
    <div className="flex-1 flex flex-col justify-between bg-bg-surface border border-border-default rounded-lg px-4 py-3 min-w-0">
      <div className="flex items-center gap-1.5">
        <span style={{ color }} className="shrink-0">{icon}</span>
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium truncate">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-[26px] font-semibold leading-none tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        {extra}
      </div>
      {sub && (
        <span className="text-[11px] text-text-muted leading-tight">{sub}</span>
      )}
    </div>
  );
}

/* ─── On-Time Gauge ─── */
function OtpGauge({ pct, color }) {
  const r = 16;
  const circumference = Math.PI * r; // semicircle
  const offset = circumference - (circumference * (pct ?? 0)) / 100;

  return (
    <svg width={40} height={22} viewBox="0 0 40 22" className="shrink-0">
      <path
        d="M 4 20 A 16 16 0 0 1 36 20"
        fill="none"
        stroke="#1A2540"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M 4 20 A 16 16 0 0 1 36 20"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

/* ─── Delay Sparkline (Recharts) ─── */
const DelaySparkline = memo(function DelaySparkline({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  return (
    <div className="flex-[2] flex flex-col justify-between bg-bg-surface border border-border-default rounded-lg px-4 py-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted uppercase tracking-[0.08em] font-medium">
          System Delay vs Baseline
        </span>
        {/* Future: Agent comparison toggle */}
        <span className="text-[10px] text-text-muted opacity-35 cursor-not-allowed" title="Train both agents first">
          DQN vs PPO
        </span>
      </div>
      <div className="h-[56px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#3D4666"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="delay"
                stroke="#FF4444"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Waiting for data...
          </div>
        )}
      </div>
    </div>
  );
});
