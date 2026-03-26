"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { calculateGrossTradeValue, TRADE_STRATEGIES } from "@/lib/trading";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface JournalEntry {
  id: string;
  date: string;
  ticker: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  strategy: string;
  rationale: string;
  cashImpact: number;
}

interface TradeJournalProps {
  transactions: Transaction[];
}

function buildJournalEntries(transactions: Transaction[]): JournalEntry[] {
  return [...transactions]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((transaction) => {
      const gross = calculateGrossTradeValue(transaction.quantity, transaction.price);
      const cashImpact =
        transaction.side === "BUY" ? -(gross + transaction.fee) : gross - transaction.fee;

      return {
        id: transaction.id,
        date: transaction.date,
        ticker: transaction.ticker,
        side: transaction.side,
        price: transaction.price,
        quantity: transaction.quantity,
        strategy: transaction.strategy,
        rationale: transaction.note ?? "",
        cashImpact,
      };
    });
}

export function TradeJournal({ transactions }: TradeJournalProps) {
  const [filterSide, setFilterSide] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [filterStrategy, setFilterStrategy] = useState<string>("ALL");

  const entries = useMemo(() => buildJournalEntries(transactions), [transactions]);
  const availableStrategies = useMemo(
    () =>
      TRADE_STRATEGIES.filter((strategy) =>
        entries.some((entry) => entry.strategy === strategy)
      ),
    [entries]
  );

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filterSide !== "ALL" && entry.side !== filterSide) return false;
      if (filterStrategy !== "ALL" && entry.strategy !== filterStrategy) return false;
      return true;
    });
  }, [entries, filterSide, filterStrategy]);

  const grouped = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>();
    for (const entry of filtered) {
      const existing = groups.get(entry.date) ?? [];
      existing.push(entry);
      groups.set(entry.date, existing);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="text-xs text-muted-foreground">Side</Label>
          <Select
            value={filterSide}
            onValueChange={(value) => setFilterSide(value as "ALL" | "BUY" | "SELL")}
          >
            <SelectTrigger className="h-8 w-full sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="text-xs text-muted-foreground">Strategy</Label>
          <Select
            value={filterStrategy}
            onValueChange={(value) => setFilterStrategy(value ?? "ALL")}
          >
            <SelectTrigger className="h-8 w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Strategies</SelectItem>
              {availableStrategies.map((strategy) => (
                <SelectItem key={strategy} value={strategy}>
                  {strategy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-[11px] text-muted-foreground sm:ml-auto sm:text-right">
          {filtered.length} entries
        </span>
      </div>

      <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
        {grouped.length > 0 ? (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatLongDate(date)}
                </span>
              </div>

              <div className="ml-1 space-y-2 border-l border-border/60 pl-3 sm:ml-3 sm:pl-4">
                {items.map((entry) => {
                  const isBuy = entry.side === "BUY";
                  const Icon = isBuy ? ArrowUp : ArrowDown;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "rounded-lg border-l-2 bg-muted/30 px-3 py-2.5",
                        isBuy ? "border-l-emerald-500" : "border-l-red-500"
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
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
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.quantity} lots @ {formatCurrency(entry.price)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.strategy}
                          </Badge>
                          <span
                            className={cn(
                              "text-xs font-medium sm:text-right",
                              entry.cashImpact >= 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {formatCurrency(entry.cashImpact)}
                          </span>
                        </div>
                      </div>

                      {entry.rationale ? (
                        <p className="mt-1 text-[12px] italic text-muted-foreground">
                          &quot;{entry.rationale}&quot;
                        </p>
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
