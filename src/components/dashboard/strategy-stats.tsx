"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import type { Transaction, EquityPoint } from "@/lib/types";

const SHARES_PER_LOT = 100;

interface StrategyStatsProps {
  transactions: Transaction[];
  equitySeries: EquityPoint[];
}

interface PeriodStats {
  label: string;
  returnPct: number;
  winRate: number | null;
  trades: number;
  sharpe: number | null;
}

export function StrategyStats({ transactions, equitySeries }: StrategyStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();

    function statsForDays(days: number, label: string): PeriodStats {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const periodTrades = transactions.filter((t) => t.date >= cutoffStr);
      const periodEquity = equitySeries.filter((e) => e.date >= cutoffStr);

      // Return
      const first = periodEquity[0]?.equity ?? 0;
      const last = periodEquity[periodEquity.length - 1]?.equity ?? 0;
      const returnPct = first > 0 ? (last - first) / first : 0;

      // Win rate from sells
      const sells = periodTrades.filter((t) => t.side === "SELL");
      let winCount = 0;
      for (const sell of sells) {
        // Simple heuristic: if sell price > average buy price for that ticker
        const buys = transactions.filter(
          (t) => t.side === "BUY" && t.ticker === sell.ticker && t.date <= sell.date
        );
        const avgBuy =
          buys.length > 0
            ? buys.reduce((s, b) => s + b.price, 0) / buys.length
            : sell.price;
        if (sell.price > avgBuy) winCount++;
      }
      const winRate = sells.length > 0 ? winCount / sells.length : null;

      // Sharpe (simplified: annualized return / annualized stddev of daily returns)
      const dailyReturns = periodEquity
        .map((p, i) => {
          if (i === 0) return 0;
          const prev = periodEquity[i - 1].equity;
          return prev > 0 ? (p.equity - prev) / prev : 0;
        })
        .slice(1);

      let sharpe: number | null = null;
      if (dailyReturns.length > 5) {
        const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const variance =
          dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length;
        const stddev = Math.sqrt(variance);
        sharpe = stddev > 0 ? (mean / stddev) * Math.sqrt(252) : null;
      }

      return {
        label,
        returnPct,
        winRate,
        trades: periodTrades.length,
        sharpe,
      };
    }

    return [
      statsForDays(1, "Today"),
      statsForDays(7, "1 Week"),
      statsForDays(30, "1 Month"),
      statsForDays(365, "YTD"),
    ];
  }, [transactions, equitySeries]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">
          Strategy Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Period</TableHead>
              <TableHead className="text-right text-[11px]">Return</TableHead>
              <TableHead className="text-right text-[11px]">Win Rate</TableHead>
              <TableHead className="text-right text-[11px]">Trades</TableHead>
              <TableHead className="text-right text-[11px]">Sharpe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-sm font-medium">{row.label}</TableCell>
                <TableCell
                  className={cn(
                    "text-right text-sm",
                    row.returnPct >= 0 ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {row.returnPct >= 0 ? "+" : ""}
                  {formatPercent(row.returnPct)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {row.winRate != null ? formatPercent(row.winRate) : "—"}
                </TableCell>
                <TableCell className="text-right text-sm">{row.trades}</TableCell>
                <TableCell className="text-right text-sm">
                  {row.sharpe != null ? row.sharpe.toFixed(2) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
