"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

interface SignalFeedProps {
  signals: SignalNotification[];
  maxItems?: number;
}

const typeConfig: Record<
  string,
  { color: string; border: string; icon: React.ElementType; label: string }
> = {
  BUY: {
    color: "text-emerald-400",
    border: "border-l-emerald-500",
    icon: ArrowUp,
    label: "BUY",
  },
  SELL: {
    color: "text-rose-400",
    border: "border-l-rose-500",
    icon: ArrowDown,
    label: "SELL",
  },
  HOLD: {
    color: "text-amber-400",
    border: "border-l-amber-500",
    icon: Minus,
    label: "HOLD",
  },
  ALERT: {
    color: "text-blue-400",
    border: "border-l-blue-500",
    icon: AlertTriangle,
    label: "ALERT",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function SignalFeed({ signals, maxItems = 6 }: SignalFeedProps) {
  const items = signals.slice(0, maxItems);

  return (
    <Card className="h-full glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold uppercase tracking-wider flex items-center gap-2">
            Live Signals
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
          </CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">
            {signals.length} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 overflow-auto" style={{ maxHeight: 320 }}>
        {items.length > 0 ? (
          items.map((signal, idx) => {
            const cfg = typeConfig[signal.type] ?? typeConfig.ALERT;
            const Icon = cfg.icon;

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "rounded-lg border-l-2 bg-muted/30 px-3 py-2.5 transition-all duration-200 hover:bg-muted/50",
                  cfg.border
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-3.5", cfg.color)} />
                    <span className={cn("text-xs font-bold", cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {signal.ticker}
                      {(signal.confidence ?? 0) >= 0.8 && (
                        <span className="flex size-1.5 rounded-full bg-red-500 animate-pulse" title="High Urgency" />
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(signal.createdAt)}
                  </span>
                </div>

                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {signal.message}
                </p>

                {signal.confidence != null ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1 rounded-full",
                          signal.confidence >= 0.8
                            ? "bg-emerald-500"
                            : signal.confidence >= 0.6
                              ? "bg-amber-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${signal.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round(signal.confidence * 100)}%
                    </span>
                  </div>
                ) : null}
              </motion.div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No signals yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
