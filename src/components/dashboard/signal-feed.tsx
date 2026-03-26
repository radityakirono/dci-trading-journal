"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatLongDate } from "@/lib/format";
import type { MarketPriceSnapshot } from "@/lib/market";
import {
  buildSignalExecutionOutcomeMap,
  type SignalExecutionOutcome,
} from "@/lib/signal-outcomes";
import { cn } from "@/lib/utils";
import type { TradingSignal, Transaction } from "@/lib/types";

interface SignalFeedProps {
  signals: TradingSignal[];
  marketData: Record<string, MarketPriceSnapshot>;
  marketPrices: Record<string, number>;
  transactions: Transaction[];
  onExecuteSignal: (signal: TradingSignal) => void;
  onDismissSignal: (signalId: string) => Promise<void>;
  disabled?: boolean;
  readOnlyReason?: string;
  pendingSignalId?: string | null;
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

function statusTone(status: TradingSignal["status"]) {
  switch (status) {
    case "EXECUTED":
      return "default";
    case "DISMISSED":
      return "secondary";
    case "EXPIRED":
      return "outline";
    default:
      return "outline";
  }
}

function getOutcomeMeta(
  signal: TradingSignal,
  outcome: SignalExecutionOutcome | null
) {
  if (signal.status !== "EXECUTED") {
    return {
      label: "N/A",
      detail: signal.status === "DISMISSED" ? "Dismissed" : "No execution",
      tone: "text-muted-foreground",
    };
  }

  if (!signal.linkedTransactionId) {
    return {
      label: "Pending sync",
      detail: "Linked transaction missing",
      tone: "text-muted-foreground",
    };
  }

  if (!outcome || outcome.amount == null) {
    return {
      label: "Pending mark",
      detail: "Waiting for trade outcome",
      tone: "text-muted-foreground",
    };
  }

  const prefix = outcome.amount > 0 ? "+" : "";
  const detail =
    outcome.kind === "realized"
      ? "Realized"
      : outcome.kind === "mark_to_market"
        ? "Open mark-to-market"
        : outcome.kind === "mixed"
          ? `Mixed result${outcome.remainingLots > 0 ? ` • ${outcome.remainingLots} lots open` : ""}`
          : "Awaiting market price";

  return {
    label: `${prefix}${formatCurrency(outcome.amount)}`,
    detail,
    tone:
      outcome.amount > 0
        ? "text-emerald-400"
        : outcome.amount < 0
          ? "text-rose-400"
          : "text-muted-foreground",
  };
}

export function SignalFeed({
  signals,
  marketData,
  marketPrices,
  transactions,
  onExecuteSignal,
  onDismissSignal,
  disabled = false,
  readOnlyReason = "Read-only access",
  pendingSignalId = null,
}: SignalFeedProps) {
  const outcomeMap = useMemo(
    () => buildSignalExecutionOutcomeMap(transactions, marketPrices),
    [marketPrices, transactions]
  );
  const sortedSignals = [...signals].sort(
    (left, right) => new Date(right.signalTs).getTime() - new Date(left.signalTs).getTime()
  );
  const activeSignals = sortedSignals.filter((signal) => signal.status === "ACTIVE");
  const historySignals = sortedSignals.filter((signal) => signal.status !== "ACTIVE");

  return (
    <Card className="h-full glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider">
            Live Signals
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
          </CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">
            {activeSignals.length} active
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="active">Active Signals</TabsTrigger>
            <TabsTrigger value="history">Signal History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-2">
            {disabled ? (
              <p className="text-xs text-muted-foreground">{readOnlyReason}</p>
            ) : null}
            <div className="space-y-2 overflow-auto" style={{ maxHeight: 360 }}>
              {activeSignals.length > 0 ? (
                activeSignals.map((signal, index) => {
                  const cfg = typeConfig[signal.type] ?? typeConfig.ALERT;
                  const Icon = cfg.icon;
                  const snapshot = marketData[signal.ticker];
                  const canExecute = signal.type === "BUY" || signal.type === "SELL";
                  const isPending = pendingSignalId === signal.id;

                  return (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "rounded-lg border-l-2 bg-muted/30 px-3 py-3 transition-all duration-200 hover:bg-muted/50",
                        cfg.border
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", cfg.color)} />
                          <span className={cn("text-xs font-bold", cfg.color)}>{cfg.label}</span>
                          <span className="text-sm font-semibold">{signal.ticker}</span>
                          <Badge variant={statusTone(signal.status)}>{signal.status}</Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(signal.signalTs)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                        {signal.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {snapshot ? <span>Current price {formatCurrency(snapshot.price)}</span> : null}
                        {snapshot?.isDelayed ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                            Delayed
                          </span>
                        ) : null}
                        {signal.regime ? (
                          <span className="rounded-full border border-border/50 px-2 py-0.5">
                            {signal.regime}
                          </span>
                        ) : null}
                      </div>

                      {signal.confidence != null ? (
                        <div className="mt-2 flex items-center gap-2">
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

                      <div className="mt-3 flex flex-wrap gap-2">
                        {canExecute ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onExecuteSignal(signal)}
                            disabled={disabled}
                            title={disabled ? readOnlyReason : undefined}
                          >
                            {isPending ? "Executing Signal" : "Execute Signal"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void onDismissSignal(signal.id)}
                          disabled={disabled}
                          title={disabled ? readOnlyReason : undefined}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No active signals right now.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="hidden md:block">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Ticker</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Confidence</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Outcome</th>
                      <th className="px-3 py-2">Action Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historySignals.length > 0 ? (
                      historySignals.map((signal) => {
                        const outcome = signal.linkedTransactionId
                          ? outcomeMap[signal.linkedTransactionId] ?? null
                          : null;
                        const outcomeMeta = getOutcomeMeta(signal, outcome);

                        return (
                          <tr key={signal.id} className="border-t border-border/50">
                            <td className="px-3 py-2">{formatLongDate(signal.signalTs)}</td>
                            <td className="px-3 py-2 font-medium">{signal.ticker}</td>
                            <td className="px-3 py-2">{signal.type}</td>
                            <td className="px-3 py-2">
                              {signal.confidence != null
                                ? `${Math.round(signal.confidence * 100)}%`
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={statusTone(signal.status)}>{signal.status}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="space-y-0.5">
                                <p className={cn("font-medium", outcomeMeta.tone)}>
                                  {outcomeMeta.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {outcomeMeta.detail}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {signal.actionDate ? formatLongDate(signal.actionDate) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                          No signal history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {historySignals.length > 0 ? (
                historySignals.map((signal) => {
                  const outcome = signal.linkedTransactionId
                    ? outcomeMap[signal.linkedTransactionId] ?? null
                    : null;
                  const outcomeMeta = getOutcomeMeta(signal, outcome);

                  return (
                    <div key={signal.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{signal.ticker}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatLongDate(signal.signalTs)}
                          </p>
                        </div>
                        <Badge variant={statusTone(signal.status)}>{signal.status}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Type</span>
                          <span>{signal.type}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Confidence</span>
                          <span>
                            {signal.confidence != null
                              ? `${Math.round(signal.confidence * 100)}%`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">Outcome</span>
                          <div className="text-right">
                            <p className={cn("font-medium", outcomeMeta.tone)}>
                              {outcomeMeta.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {outcomeMeta.detail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Action Date</span>
                          <span>{signal.actionDate ? formatLongDate(signal.actionDate) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No signal history yet.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
