"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceTargetDialog } from "@/components/dashboard/price-target-dialog";
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
import type { MarketPriceSnapshot } from "@/lib/market";
import { cn } from "@/lib/utils";
import type { PriceTargetWatch, Transaction } from "@/lib/types";

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
  marketData: Record<string, MarketPriceSnapshot>;
  priceTargets?: PriceTargetWatch[];
  onSavePriceTarget?: (input: {
    ticker: string;
    targetPrice: number;
    currentPrice: number | null;
  }) => Promise<void>;
  onClearPriceTarget?: (ticker: string) => Promise<void>;
}

function SortableHead({
  label,
  sortKey,
  align = "left",
  sortConfig,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  align?: "left" | "right";
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortConfig.key === sortKey;
  const ariaSort = isActive
    ? sortConfig.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <TableHead
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "select-none",
        align === "right" && "text-right"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          align === "right" && "justify-end"
        )}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        {isActive ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-20" />
        )}
        <span className="sr-only">
          {isActive && sortConfig.direction === "desc"
            ? `Activate to sort ${label} ascending`
            : `Activate to sort ${label} descending`}
        </span>
      </button>
    </TableHead>
  );
}

export function PortfolioTable({
  transactions,
  marketPrices,
  marketData,
  priceTargets = [],
  onSavePriceTarget,
  onClearPriceTarget,
}: PortfolioTableProps) {
  const [historyTicker, setHistoryTicker] = useState<string>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "marketValue",
    direction: "desc",
  });
  const [targetDialogTicker, setTargetDialogTicker] = useState<string | null>(null);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [targetError, setTargetError] = useState("");

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

        const snapshot = marketData[ticker];
        const actualDayChange = snapshot?.change ?? 0;

        return {
          ticker,
          quantity: value.quantity,
          costBasis: value.costBasis,
          averageCost,
          marketPrice: value.marketPrice,
          dayChange: actualDayChange,
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
  }, [marketData, marketPrices, transactions, sortConfig]);

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

  const targetMap = useMemo(
    () => Object.fromEntries(priceTargets.map((target) => [target.ticker, target])),
    [priceTargets]
  );
  const activeTarget = targetDialogTicker ? targetMap[targetDialogTicker] ?? null : null;
  const activeTargetPosition = targetDialogTicker
    ? positions.find((position) => position.ticker === targetDialogTicker) ?? null
    : null;

  async function handleSaveTarget(input: {
    ticker: string;
    targetPrice: number;
    currentPrice: number | null;
  }) {
    if (!onSavePriceTarget) return;
    if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0) {
      setTargetError("Target price must be greater than zero.");
      return;
    }

    try {
      setIsSavingTarget(true);
      setTargetError("");
      await onSavePriceTarget(input);
      setTargetDialogTicker(null);
    } catch (error) {
      setTargetError(
        error instanceof Error ? error.message : "Failed to save price target."
      );
    } finally {
      setIsSavingTarget(false);
    }
  }

  async function handleClearTarget(ticker: string) {
    if (!onClearPriceTarget) return;

    try {
      setIsSavingTarget(true);
      setTargetError("");
      await onClearPriceTarget(ticker);
      setTargetDialogTicker(null);
    } catch (error) {
      setTargetError(
        error instanceof Error ? error.message : "Failed to clear price target."
      );
    } finally {
      setIsSavingTarget(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="positions" className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="positions">Open Positions</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>
            <div className="grid gap-1 text-small sm:text-right">
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
            <p className="mb-2 text-xs text-muted-foreground sm:hidden">
              Swipe sideways to see all position columns.
            </p>
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <SortableHead label="Ticker" sortKey="ticker" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Qty (lots)" sortKey="quantity" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Avg Cost" sortKey="averageCost" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Last Price" sortKey="marketPrice" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Day Change" sortKey="dayChange" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Market Value" sortKey="marketValue" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Cost Basis" sortKey="costBasis" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Unrealized P/L" sortKey="unrealizedPnL" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHead label="Weight %" sortKey="weight" align="right" sortConfig={sortConfig} onSort={handleSort} />
                  <TableHead className="text-right">Target Alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length > 0 ? (
                  positions.map((position) => {
                    const snapshot = marketData[position.ticker];
                    const dayChangePct =
                      snapshot?.prevClose && snapshot.prevClose > 0
                        ? position.dayChange / snapshot.prevClose
                        : position.marketPrice > 0
                          ? position.dayChange / position.marketPrice
                          : 0;
                    return (
                      <TableRow key={position.ticker} className="group hover:bg-muted/30">
                        <TableCell className="font-semibold">{position.ticker}</TableCell>
                        <TableCell className="text-right">{formatNumber(position.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(position.averageCost)}</TableCell>
                        <TableCell className="text-right font-medium transition-colors">
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatCurrency(position.marketPrice)}</span>
                            {snapshot?.isDelayed ? (
                              <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] text-amber-300">
                                Delayed
                              </Badge>
                            ) : null}
                          </div>
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
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            {targetMap[position.ticker] ? (
                              <div className="text-right">
                                <p className="text-xs font-medium">
                                  {formatCurrency(targetMap[position.ticker].targetPrice)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Trigger {targetMap[position.ticker].direction}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                No target
                              </p>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                setTargetError("");
                                setTargetDialogTicker(position.ticker);
                              }}
                            >
                              <BellRing className="size-3" />
                              {targetMap[position.ticker] ? "Edit" : "Set Target"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      No open positions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="history">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="hidden md:block">
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
            </div>

            <div className="space-y-3 md:hidden">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((trade) => {
                  const gross = trade.quantity * SHARES_PER_LOT * trade.price;
                  const cashImpact =
                    trade.side === "BUY" ? -(gross + trade.fee) : gross - trade.fee;
                  return (
                    <div key={trade.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{trade.ticker}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatLongDate(trade.date)}
                          </p>
                        </div>
                        <Badge variant={trade.side === "BUY" ? "default" : "secondary"}>
                          {trade.side}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Quantity</span>
                          <span>{formatNumber(trade.quantity)} lots</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Price</span>
                          <span>{formatCurrency(trade.price)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Fee</span>
                          <span>{formatCurrency(trade.fee)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Cash Impact</span>
                          <span
                            className={cashImpact >= 0 ? "text-emerald-500" : "text-red-500"}
                          >
                            {formatCurrency(cashImpact)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No transactions for this filter.
                </p>
              )}
            </div>
          </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PriceTargetDialog
        key={activeTarget?.id ?? targetDialogTicker ?? "price-target-dialog"}
        open={targetDialogTicker != null}
        ticker={targetDialogTicker}
        currentPrice={activeTargetPosition?.marketPrice ?? null}
        existingTarget={activeTarget}
        isSaving={isSavingTarget}
        error={targetError}
        onOpenChange={(open) => {
          if (!open) {
            setTargetDialogTicker(null);
            setTargetError("");
          }
        }}
        onSave={handleSaveTarget}
        onClear={onClearPriceTarget ? handleClearTarget : undefined}
      />
    </>
  );
}
