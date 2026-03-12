"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const SHARES_PER_LOT = 100;

interface Position {
  ticker: string;
  quantity: number;
  costBasis: number;
  averageCost: number;
  marketPrice: number;
  dayChange: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  weight: number;
}

type SortKey = keyof Position;
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "marketValue",
    direction: "desc",
  });

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

    const rawPositions = Array.from(positionMap.entries())
      .map(([ticker, value]) => {
        const averageCost =
          value.quantity > 0
            ? value.costBasis / (value.quantity * SHARES_PER_LOT)
            : 0;
        const marketValue = value.quantity * SHARES_PER_LOT * value.marketPrice;
        const unrealizedPnL = marketValue - value.costBasis;
        const unrealizedPnLPct = value.costBasis > 0 ? unrealizedPnL / value.costBasis : 0;

        // Mock a previous close / day change for UI purposes
        const mockDayChange = value.marketPrice * ((ticker.length * 0.005) * (ticker.charCodeAt(0) % 2 === 0 ? 1 : -1));

        return {
          ticker,
          quantity: value.quantity,
          costBasis: value.costBasis,
          averageCost,
          marketPrice: value.marketPrice,
          dayChange: mockDayChange,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPct,
          weight: 0, // Will calculate next
        } satisfies Position;
      })
      .filter((position) => position.quantity > 0);

    const totalValue = rawPositions.reduce((sum, p) => sum + p.marketValue, 0);

    const withWeights = rawPositions.map((p) => ({
      ...p,
      weight: totalValue > 0 ? p.marketValue / totalValue : 0,
    }));

    return withWeights.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [marketPrices, transactions, sortConfig]);

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
  const totalCostBasis = positions.reduce((sum, position) => sum + position.costBasis, 0);
  const totalUnrealizedPnL = positions.reduce(
    (sum, position) => sum + position.unrealizedPnL,
    0
  );
  const totalUnrealizedPnLPct = totalCostBasis > 0 ? totalUnrealizedPnL / totalCostBasis : 0;

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const SortableHead = ({ label, sortKey, align = "left" }: { label: string; sortKey: SortKey; align?: "left" | "right" }) => (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground", align === "right" && "text-right")}
      onClick={() => handleSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end")}>
        {label}
        {sortConfig.key === sortKey ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-20" />
        )}
      </div>
    </TableHead>
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
                  totalUnrealizedPnL >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"
                }
              >
                Unrealized P/L: {totalUnrealizedPnL >= 0 ? "+" : ""}{formatCurrency(totalUnrealizedPnL)} ({formatPercent(totalUnrealizedPnLPct)})
              </span>
            </div>
          </div>

          <TabsContent value="positions" className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <SortableHead label="Ticker" sortKey="ticker" />
                  <SortableHead label="Qty (lots)" sortKey="quantity" align="right" />
                  <SortableHead label="Avg Cost" sortKey="averageCost" align="right" />
                  <SortableHead label="Last Price" sortKey="marketPrice" align="right" />
                  <SortableHead label="Day Change" sortKey="dayChange" align="right" />
                  <SortableHead label="Market Value" sortKey="marketValue" align="right" />
                  <SortableHead label="Cost Basis" sortKey="costBasis" align="right" />
                  <SortableHead label="Unrealized P/L" sortKey="unrealizedPnL" align="right" />
                  <SortableHead label="Weight %" sortKey="weight" align="right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length > 0 ? (
                  positions.map((position) => {
                    const dayChangePct = position.marketPrice > 0 ? position.dayChange / position.marketPrice : 0;
                    return (
                      <TableRow key={position.ticker} className="group hover:bg-muted/30">
                        <TableCell className="font-semibold">{position.ticker}</TableCell>
                        <TableCell className="text-right">{formatNumber(position.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(position.averageCost)}</TableCell>
                        <TableCell className="text-right font-medium transition-colors">
                          {formatCurrency(position.marketPrice)}
                        </TableCell>
                        <TableCell className={cn("text-right text-[13px]", position.dayChange >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {position.dayChange >= 0 ? "+" : ""}{formatCurrency(position.dayChange)}
                          <span className="ml-1 opacity-70">({formatPercent(dayChangePct)})</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(position.marketValue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(position.costBasis)}</TableCell>
                        <TableCell className={cn("text-right", position.unrealizedPnL >= 0 ? "text-emerald-500" : "text-red-500")}>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-medium">
                              {position.unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(position.unrealizedPnL)}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4 border-current")}>
                              {position.unrealizedPnLPct >= 0 ? "+" : ""}{formatPercent(position.unrealizedPnLPct)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="w-10 text-[12px]">{formatPercent(position.weight)}</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${position.weight * 100}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
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
