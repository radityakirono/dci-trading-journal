"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral" | "warning";
  icon: LucideIcon;
  sparkData?: number[];
  pulse?: boolean;
}

const toneConfig = {
  positive: {
    border: "border-l-emerald-500",
    delta: "text-emerald-500",
    spark: "#22c55e",
  },
  negative: {
    border: "border-l-red-500",
    delta: "text-red-500",
    spark: "#ef4444",
  },
  warning: {
    border: "border-l-amber-500",
    delta: "text-amber-500",
    spark: "#f59e0b",
  },
  neutral: {
    border: "border-l-slate-500",
    delta: "text-muted-foreground",
    spark: "#64748b",
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-60">
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
}: MetricCardProps) {
  const cfg = toneConfig[tone];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="h-full"
    >
      <div
        className={cn(
          "flex h-full flex-col gap-1 rounded-xl border-l-2 bg-card/80 px-3.5 py-3 ring-1 ring-foreground/10 backdrop-blur-sm transition-colors hover:ring-foreground/20",
          cfg.border
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
          <span className="relative rounded-lg border border-border/70 bg-muted/70 p-1 text-muted-foreground">
            <Icon className="size-3.5" />
            {pulse ? (
              <span className="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full bg-primary" />
            ) : null}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="text-lg font-semibold leading-tight">{value}</p>
          {sparkData ? (
            <MiniSparkline data={sparkData} color={cfg.spark} />
          ) : null}
        </div>

        <p className={cn("text-[12px] leading-tight", cfg.delta)}>{delta}</p>
      </div>
    </motion.div>
  );
}
