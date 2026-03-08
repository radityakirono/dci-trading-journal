"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCompactCurrency,
  formatCurrency,
  formatLongDate,
  formatNumber,
} from "@/lib/format";
import type { Transaction } from "@/lib/types";

const SHARES_PER_LOT = 100;

interface Position {
  ticker: string;
  quantity: number;
  costBasis: number;
  averageCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
}

interface PortfolioTableProps {
  transactions: Transaction[];
  marketPrices: Record<string, number>;
}

export function PortfolioTable({
  transactions,
  marketPrices,
}: PortfolioTableProps) {
  const [historyTicker, setHistoryTicker] = useState<string>("ALL");

  const positions = useMemo(() => {
    const positionMap = new Map<
      string,
      { quantity: number; costBasis: number; marketPrice: number }
    >();

    for (const trade of transactions) {
      const current = positionMap.get(trade.ticker) ?? {
        quantity: 0,
        costBasis: 0,
        marketPrice: marketPrices[trade.ticker] ?? trade.price,
      };

      if (trade.side === "BUY") {
        current.quantity += trade.quantity;
        current.costBasis += trade.quantity * SHARES_PER_LOT * trade.price + trade.fee;
      } else {
        const sellQty = Math.min(trade.quantity, current.quantity);
        const averageCostPerLot =
          current.quantity > 0 ? current.costBasis / current.quantity : 0;
        current.quantity -= sellQty;
        current.costBasis = Math.max(0, current.costBasis - averageCostPerLot * sellQty);
      }

      current.marketPrice = marketPrices[trade.ticker] ?? current.marketPrice;
      positionMap.set(trade.ticker, current);
    }

    return Array.from(positionMap.entries())
      .map(([ticker, value]) => {
        const averageCost =
          value.quantity > 0
            ? value.costBasis / (value.quantity * SHARES_PER_LOT)
            : 0;
        const marketValue = value.quantity * SHARES_PER_LOT * value.marketPrice;
        const unrealizedPnL = marketValue - value.costBasis;

        return {
          ticker,
          quantity: value.quantity,
          costBasis: value.costBasis,
          averageCost,
          marketPrice: value.marketPrice,
          marketValue,
          unrealizedPnL,
        } satisfies Position;
      })
      .filter((position) => position.quantity > 0)
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [marketPrices, transactions]);

  const transactionHistory = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const tickerOptions = useMemo(() => {
    return ["ALL", ...new Set(transactionHistory.map((trade) => trade.ticker))];
  }, [transactionHistory]);

  const filteredHistory = useMemo(() => {
    if (historyTicker === "ALL") return transactionHistory;
    return transactionHistory.filter((trade) => trade.ticker === historyTicker);
  }, [historyTicker, transactionHistory]);

  const totalMarketValue = positions.reduce(
    (sum, position) => sum + position.marketValue,
    0
  );
  const totalUnrealizedPnL = positions.reduce(
    (sum, position) => sum + position.unrealizedPnL,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="positions" className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="positions">Open Positions</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>
            <div className="grid gap-1 text-right text-small">
              <span className="text-muted-foreground">
                Market Value: {formatCompactCurrency(totalMarketValue)}
              </span>
              <span
                className={
                  totalUnrealizedPnL >= 0 ? "text-emerald-500" : "text-red-500"
                }
              >
                Unrealized P/L: {formatCurrency(totalUnrealizedPnL)}
              </span>
            </div>
          </div>

          <TabsContent value="positions">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Quantity (lots)</TableHead>
                  <TableHead>Average Cost</TableHead>
                  <TableHead>Last Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>Unrealized P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length > 0 ? (
                  positions.map((position) => (
                    <TableRow key={position.ticker}>
                      <TableCell className="font-medium">{position.ticker}</TableCell>
                      <TableCell>{formatNumber(position.quantity)}</TableCell>
                      <TableCell>{formatCurrency(position.averageCost)}</TableCell>
                      <TableCell>{formatCurrency(position.marketPrice)}</TableCell>
                      <TableCell>{formatCurrency(position.marketValue)}</TableCell>
                      <TableCell
                        className={
                          position.unrealizedPnL >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        }
                      >
                        {formatCurrency(position.unrealizedPnL)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No open positions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="history">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-small text-muted-foreground">Filter by ticker</p>
              <Select
                value={historyTicker}
                onValueChange={(value) => setHistoryTicker(value ?? "ALL")}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tickerOptions.map((ticker) => (
                    <SelectItem key={ticker} value={ticker}>
                      {ticker === "ALL" ? "All Tickers" : ticker}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity (lots)</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Cash Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((trade) => {
                    const gross = trade.quantity * SHARES_PER_LOT * trade.price;
                    const cashImpact =
                      trade.side === "BUY" ? -(gross + trade.fee) : gross - trade.fee;
                    return (
                      <TableRow key={trade.id}>
                        <TableCell>{formatLongDate(trade.date)}</TableCell>
                        <TableCell className="font-medium">{trade.ticker}</TableCell>
                        <TableCell>
                          <Badge
                            variant={trade.side === "BUY" ? "default" : "secondary"}
                          >
                            {trade.side === "BUY" ? "BUY" : "SELL"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNumber(trade.quantity)}</TableCell>
                        <TableCell>{formatCurrency(trade.price)}</TableCell>
                        <TableCell>{formatCurrency(trade.fee)}</TableCell>
                        <TableCell
                          className={
                            cashImpact >= 0 ? "text-emerald-500" : "text-red-500"
                          }
                        >
                          {formatCurrency(cashImpact)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No transactions for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
