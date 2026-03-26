"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { InfoTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral" | "warning";
  icon: LucideIcon;
  sparkData?: number[];
  pulse?: boolean;
  helpText?: string;
}

const toneConfig = {
  positive: {
    border: "border-l-emerald-500",
    delta: "text-emerald-400",
    spark: "#34d399",
    iconBg: "bg-emerald-500/10 text-emerald-400",
  },
  negative: {
    border: "border-l-rose-500",
    delta: "text-rose-400",
    spark: "#fb7185",
    iconBg: "bg-rose-500/10 text-rose-400",
  },
  warning: {
    border: "border-l-amber-400",
    delta: "text-amber-400",
    spark: "#fbbf24",
    iconBg: "bg-amber-500/10 text-amber-400",
  },
  neutral: {
    border: "border-l-slate-400",
    delta: "text-muted-foreground",
    spark: "#8b9dc3",
    iconBg: "bg-muted text-muted-foreground",
  },
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 56;
  const h = 22;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  tone,
  icon: Icon,
  sparkData,
  pulse,
  helpText,
}: MetricCardProps) {
  const cfg = toneConfig[tone];

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <div
        className={cn(
          "glass-card flex h-full flex-col gap-1.5 rounded-xl border-l-2 px-3.5 py-3 transition-all duration-300",
          cfg.border
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
            {helpText ? (
              <InfoTooltip
                content={helpText}
                label={`Show ${label} explanation`}
                className="size-4 border-border/40 bg-transparent"
                contentClassName="w-56"
              />
            ) : null}
          </div>
          <span className={cn("relative rounded-lg p-1.5", cfg.iconBg)}>
            <Icon className="size-3.5" />
            {pulse ? (
              <span className="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" />
            ) : null}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="text-xl font-bold leading-tight tracking-tight">{value}</p>
          {sparkData ? (
            <MiniSparkline data={sparkData} color={cfg.spark} />
          ) : null}
        </div>

        <p className={cn("text-[11px] font-medium leading-tight", cfg.delta)}>{delta}</p>
      </div>
    </motion.div>
  );
}

