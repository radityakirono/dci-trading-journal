"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatCurrency, formatLongDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

const SHARES_PER_LOT = 100;

const STRATEGIES = [
  "Momentum",
  "Mean Reversion",
  "Breakout",
  "Swing",
  "Signal-Based",
  "Trend Following",
] as const;

interface JournalEntry {
  id: string;
  date: string;
  ticker: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pnl: number | null;
  strategy: string;
  rationale: string;
  lesson?: string;
  tags: string[];
}

interface TradeJournalProps {
  transactions: Transaction[];
}

function buildJournalEntries(transactions: Transaction[]): JournalEntry[] {
  return [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => ({
      id: t.id,
      date: t.date,
      ticker: t.ticker,
      side: t.side,
      price: t.price,
      quantity: t.quantity,
      pnl: null,
      strategy: "Signal-Based",
      rationale: t.note ?? "",
      tags: [],
    }));
}

export function TradeJournal({ transactions }: TradeJournalProps) {
  const [filterSide, setFilterSide] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [filterStrategy, setFilterStrategy] = useState<string>("ALL");

  const entries = useMemo(
    () => buildJournalEntries(transactions),
    [transactions]
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterSide !== "ALL" && e.side !== filterSide) return false;
      if (filterStrategy !== "ALL" && e.strategy !== filterStrategy) return false;
      return true;
    });
  }, [entries, filterSide, filterStrategy]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of filtered) {
      const existing = map.get(entry.date) ?? [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Side</Label>
          <Select value={filterSide} onValueChange={(v) => setFilterSide(v as "ALL" | "BUY" | "SELL")}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Strategy</Label>
          <Select value={filterStrategy} onValueChange={(v) => setFilterStrategy(v ?? "ALL")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Strategies</SelectItem>
              {STRATEGIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {filtered.length} entries
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-4" style={{ maxHeight: 420, overflowY: "auto" }}>
        {grouped.length > 0 ? (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatLongDate(date)}
                </span>
              </div>
              <div className="ml-3 space-y-2 border-l border-border/60 pl-4">
                {items.map((entry) => {
                  const isBuy = entry.side === "BUY";
                  const Icon = isBuy ? ArrowUp : ArrowDown;
                  const gross = entry.quantity * SHARES_PER_LOT * entry.price;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "rounded-lg border-l-2 bg-muted/30 px-3 py-2.5",
                        isBuy ? "border-l-emerald-500" : "border-l-red-500"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              "size-3.5",
                              isBuy ? "text-emerald-400" : "text-red-400"
                            )}
                          />
                          <Badge
                            variant={isBuy ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {entry.side}
                          </Badge>
                          <span className="text-sm font-semibold">{entry.ticker}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.quantity} lots @ {formatCurrency(entry.price)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.strategy}
                        </Badge>
                      </div>

                      {entry.rationale ? (
                        <p className="mt-1 text-[12px] italic text-muted-foreground">
                          &quot;{entry.rationale}&quot;
                        </p>
                      ) : null}

                      {entry.tags.length > 0 ? (
                        <div className="mt-1.5 flex gap-1">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No journal entries match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
