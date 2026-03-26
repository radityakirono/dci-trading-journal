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
import { buildStrategyPerformanceRows } from "@/lib/reports/data";
import { SMALL_SAMPLE_WIN_RATE_NOTE } from "@/lib/win-rate";
import type { Transaction, EquityPoint } from "@/lib/types";

interface StrategyStatsProps {
  transactions: Transaction[];
  equitySeries: EquityPoint[];
}

export function StrategyStats({ transactions, equitySeries }: StrategyStatsProps) {
  const stats = useMemo(
    () => buildStrategyPerformanceRows(transactions, equitySeries),
    [transactions, equitySeries]
  );

  return (
    <Card className="h-full glass-card">
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
                    "text-right text-sm font-mono",
                    row.returnPct == null
                      ? "text-muted-foreground"
                      : row.returnPct >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                  )}
                >
                  {row.returnPct == null ? "—" : (
                    <>
                      {row.returnPct >= 0 ? "+" : ""}
                      {formatPercent(row.returnPct)}
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-mono">
                  {row.closedTrades > 0 && row.winRate != null
                    ? `${formatPercent(row.winRate)}${row.winRateSmallSample ? "*" : ""} (n=${row.closedTrades})`
                    : "—"}
                </TableCell>
                <TableCell className="text-right text-sm font-mono">{row.trades}</TableCell>
                <TableCell className="text-right text-sm font-mono">
                  {row.sharpe != null ? row.sharpe.toFixed(2) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {stats.some((row) => row.winRateSmallSample) ? (
          <p className="mt-3 text-xs text-muted-foreground">{SMALL_SAMPLE_WIN_RATE_NOTE}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
