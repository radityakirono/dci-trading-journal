"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Diamond, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

interface SignalHeatmapProps {
  signals: SignalNotification[];
}

const typeIcons: Record<string, React.ElementType> = {
  BUY: ArrowUp,
  SELL: ArrowDown,
  HOLD: Minus,
  ALERT: Diamond,
};

function confidenceColor(c: number | null | undefined): string {
  if (c == null) return "bg-muted/40";
  if (c >= 0.8) return "bg-emerald-500/20 ring-1 ring-emerald-500/30";
  if (c >= 0.6) return "bg-amber-500/15 ring-1 ring-amber-500/25";
  return "bg-red-500/10 ring-1 ring-red-500/20";
}

function typeColor(type: string): string {
  switch (type) {
    case "BUY":
      return "text-emerald-400";
    case "SELL":
      return "text-rose-400";
    case "HOLD":
      return "text-amber-400";
    default:
      return "text-blue-400";
  }
}

export function SignalHeatmap({ signals }: SignalHeatmapProps) {
  // Deduplicate: latest signal per ticker
  const latestByTicker = useMemo(() => {
    const map = new Map<string, SignalNotification>();
    for (const s of signals) {
      const existing = map.get(s.ticker);
      if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
        map.set(s.ticker, s);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const ca = a.confidence ?? 0;
      const cb = b.confidence ?? 0;
      return cb - ca;
    });
  }, [signals]);

  return (
    <Card className="h-full glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">
          Signal Confidence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestByTicker.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {latestByTicker.map((signal) => {
              const Icon = typeIcons[signal.type] ?? Diamond;
              return (
                <div
                  key={signal.ticker}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-all duration-200 hover:scale-105 cursor-default",
                    confidenceColor(signal.confidence)
                  )}
                >
                  <Icon className={cn("size-3.5", typeColor(signal.type))} />
                  <span className="text-sm font-semibold">{signal.ticker}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {signal.confidence != null
                      ? `${Math.round(signal.confidence * 100)}%`
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No signal data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
