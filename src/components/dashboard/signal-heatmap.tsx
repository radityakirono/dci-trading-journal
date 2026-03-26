"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

interface SignalHeatmapProps {
  signals: SignalNotification[];
}

function confidenceBarTone(confidence: number | null | undefined) {
  if (confidence == null) return "bg-muted";
  if (confidence >= 0.8) return "bg-emerald-500";
  if (confidence >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function confidenceTextTone(confidence: number | null | undefined) {
  if (confidence == null) return "text-muted-foreground";
  if (confidence >= 0.8) return "text-emerald-400";
  if (confidence >= 0.6) return "text-amber-400";
  return "text-red-400";
}

export function SignalHeatmap({ signals }: SignalHeatmapProps) {
  const latestByTicker = useMemo(() => {
    const map = new Map<string, SignalNotification>();
    for (const signal of signals) {
      const existing = map.get(signal.ticker);
      if (!existing || new Date(signal.createdAt) > new Date(existing.createdAt)) {
        map.set(signal.ticker, signal);
      }
    }
    return Array.from(map.values()).sort((left, right) => {
      const leftConfidence = left.confidence ?? 0;
      const rightConfidence = right.confidence ?? 0;
      return rightConfidence - leftConfidence;
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
          <div className="space-y-3">
            {latestByTicker.map((signal) => {
              const confidence = signal.confidence ?? 0;
              const width = Math.max(8, Math.round(confidence * 100));
              return (
                <div key={signal.ticker} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{signal.ticker}</span>
                    <span className={cn("font-mono", confidenceTextTone(signal.confidence))}>
                      {signal.confidence != null
                        ? `${Math.round(confidence * 100)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                    <div
                      className={cn("h-full rounded-full transition-[width]", confidenceBarTone(signal.confidence))}
                      style={{ width: `${width}%` }}
                    />
                  </div>
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
