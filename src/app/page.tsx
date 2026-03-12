"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LineChart,
  Shield,
  Target,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { AuthButton } from "@/components/auth/auth-button";
import { useAuth } from "@/components/auth/auth-provider";
import { DciLogo } from "@/components/brand/dci-logo";
import { AnimatedSection } from "@/components/dashboard/animated-section";
import { DepositWithdrawalJournal } from "@/components/dashboard/deposit-withdrawal-journal";
import { EquityChart } from "@/components/dashboard/equity-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { SectorExposure } from "@/components/dashboard/sector-exposure";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { SignalHeatmap } from "@/components/dashboard/signal-heatmap";
import { StrategyStats } from "@/components/dashboard/strategy-stats";
import { TradeJournal } from "@/components/dashboard/trade-journal";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiError,
  createCashJournalEntry,
  createTransaction,
  fetchCashJournal,
  fetchTransactions,
} from "@/lib/api-client";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import {
  initialCashJournal,
  initialEquitySeries,
  initialTransactions,
  marketPrices,
  initialSignalNotifications,
} from "@/lib/mock-data";
import { stockUniverse } from "@/lib/stock-universe";
import { calculateBrokerFee } from "@/lib/trading";
import type {
  CashFlowEntry,
  CashFlowEntryInput,
  Transaction,
  TransactionInput,
} from "@/lib/types";

const SHARES_PER_LOT = 100;

export default function HomePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [cashJournal, setCashJournal] = useState<CashFlowEntry[]>(initialCashJournal);
  const [signalCount, setSignalCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string>("");

  // ── Derived metrics ─────────────────────────────────
  const latestEquity = initialEquitySeries[initialEquitySeries.length - 1]?.equity ?? 0;
  const previousEquity = initialEquitySeries[initialEquitySeries.length - 2]?.equity ?? 0;
  const dailyPnl = initialEquitySeries[initialEquitySeries.length - 1]?.dailyPnl ?? 0;
  const dayChange = latestEquity - previousEquity;
  const dayChangePercent = previousEquity > 0 ? dayChange / previousEquity : 0;

  // Sparkline data (last 30 equity points)
  const equitySparkData = useMemo(
    () => initialEquitySeries.slice(-30).map((p) => p.equity),
    []
  );

  const pnlSparkData = useMemo(
    () => initialEquitySeries.slice(-30).map((p) => p.dailyPnl),
    []
  );

  // Max drawdown
  const maxDrawdown = useMemo(() => {
    let peak = 0;
    let maxDd = 0;
    for (const point of initialEquitySeries) {
      if (point.equity > peak) peak = point.equity;
      const dd = peak > 0 ? (peak - point.equity) / peak : 0;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }, []);

  // Win rate from sell transactions
  const winRate = useMemo(() => {
    const sells = transactions.filter((t) => t.side === "SELL");
    if (sells.length === 0) return null;
    let wins = 0;
    for (const sell of sells) {
      const buys = transactions.filter(
        (t) => t.side === "BUY" && t.ticker === sell.ticker && t.date <= sell.date
      );
      const avgBuy =
        buys.length > 0 ? buys.reduce((s, b) => s + b.price, 0) / buys.length : sell.price;
      if (sell.price > avgBuy) wins++;
    }
    return wins / sells.length;
  }, [transactions]);

  // Active signal count
  const activeSignals = initialSignalNotifications.filter((s) => !s.isRead).length;

  // Portfolio positions for sector exposure
  const positions = useMemo(() => {
    const posMap = new Map<string, { quantity: number; costBasis: number }>();
    for (const trade of transactions) {
      const cur = posMap.get(trade.ticker) ?? { quantity: 0, costBasis: 0 };
      if (trade.side === "BUY") {
        cur.quantity += trade.quantity;
        cur.costBasis += trade.quantity * SHARES_PER_LOT * trade.price + trade.fee;
      } else {
        const sellQty = Math.min(trade.quantity, cur.quantity);
        const avgPerLot = cur.quantity > 0 ? cur.costBasis / cur.quantity : 0;
        cur.quantity -= sellQty;
        cur.costBasis = Math.max(0, cur.costBasis - avgPerLot * sellQty);
      }
      posMap.set(trade.ticker, cur);
    }
    return Array.from(posMap.entries())
      .filter(([, v]) => v.quantity > 0)
      .map(([ticker, v]) => ({
        ticker,
        quantity: v.quantity,
        marketValue: v.quantity * SHARES_PER_LOT * (marketPrices[ticker] ?? 0),
      }));
  }, [transactions]);

  // Sector map
  const sectorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stockUniverse) map[s.ticker] = s.sector;
    return map;
  }, []);

  // ── Handlers ────────────────────────────────────────
  async function handleCreateTransaction(input: TransactionInput) {
    try {
      const created = await createTransaction(input);
      setTransactions((current) => [created, ...current]);
      setSyncNotice("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const fallback: Transaction = {
          id: crypto.randomUUID(),
          date: input.date,
          ticker: input.ticker,
          side: input.side,
          quantity: input.quantity,
          price: input.price,
          fee: calculateBrokerFee(input.side, input.quantity, input.price),
          note: input.note,
        };
        setTransactions((current) => [fallback, ...current]);
        setSyncNotice("Not signed in. Transaction was saved locally only.");
        return;
      }
      throw error instanceof Error ? error : new Error("Failed to save transaction.");
    }
  }

  async function handleCreateCashEntry(input: CashFlowEntryInput) {
    try {
      const created = await createCashJournalEntry(input);
      setCashJournal((current) => [created, ...current]);
      setSyncNotice("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const fallback: CashFlowEntry = {
          id: crypto.randomUUID(),
          date: input.date,
          type: input.type,
          amount: input.amount,
          note: input.note,
        };
        setCashJournal((current) => [fallback, ...current]);
        setSyncNotice("Not signed in. Journal entry was saved locally only.");
        return;
      }
      throw error instanceof Error ? error : new Error("Failed to save journal entry.");
    }
  }

  const loadCoreData = useCallback(async () => {
    try {
      const [remoteTransactions, remoteCashJournal] = await Promise.all([
        fetchTransactions(),
        fetchCashJournal(),
      ]);
      setTransactions(remoteTransactions);
      setCashJournal(remoteCashJournal);
      setSyncNotice("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSyncNotice("Sign in to sync transactions and cash journal with Supabase.");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to sync data.";
      console.error("Failed to sync core data:", message);
    }
  }, []);

  const loadSignalNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/signals?limit=50");
      if (!res.ok) throw new Error("Failed to load signals");
      const data = (await res.json()) as {
        signals: { id: string; read_at: string | null }[];
      };
      const unread = (data.signals || []).filter((s) => !s.read_at).length;
      setSignalCount(unread);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("Failed to load signal count:", message);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void loadCoreData();
      void loadSignalNotifications();
    };
    const timer = window.setTimeout(run, 0);
    return () => window.clearTimeout(timer);
  }, [loadCoreData, loadSignalNotifications, user]);

  useEffect(() => {
    const run = () => void loadSignalNotifications();
    const timer = window.setTimeout(run, 0);
    const interval = window.setInterval(run, 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [loadSignalNotifications]);

  // ── Render ──────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <DciLogo />
          <div className="flex items-center gap-2">
            <NotificationBell unreadCount={signalCount} recentSignals={initialSignalNotifications} />
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>

        {syncNotice ? (
          <p className="mb-3 text-sm text-amber-500">{syncNotice}</p>
        ) : null}

        {/* ── 1. Metrics Ribbon ──────────────────────── */}
        <AnimatedSection id="metrics" className="mb-6">
          <section className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
            <MetricCard
              label="Portfolio Value"
              value={formatCompactCurrency(latestEquity)}
              delta={`${dayChange >= 0 ? "+" : ""}${formatCurrency(dayChange)}`}
              tone={dayChange >= 0 ? "positive" : "negative"}
              icon={Wallet}
              sparkData={equitySparkData}
            />
            <MetricCard
              label="Portfolio Return"
              value={formatPercent(dayChangePercent * 100 / 100)}
              delta={`${formatCompactCurrency(latestEquity - initialEquitySeries[0].equity)} total`}
              tone={dayChangePercent >= 0 ? "positive" : "negative"}
              icon={LineChart}
            />
            <MetricCard
              label="Daily P/L"
              value={formatCurrency(dailyPnl)}
              delta={dailyPnl >= 0 ? "Daily Profit" : "Daily Loss"}
              tone={dailyPnl >= 0 ? "positive" : "negative"}
              icon={Activity}
              sparkData={pnlSparkData}
            />
            <MetricCard
              label="Active Signals"
              value={String(activeSignals)}
              delta={activeSignals > 0 ? "New signals" : "No new signals"}
              tone={activeSignals > 0 ? "warning" : "neutral"}
              icon={Target}
              pulse={activeSignals > 0}
            />
            <MetricCard
              label="Portfolio Risk"
              value={positions.length > 5 ? "HIGH" : positions.length > 2 ? "MODERATE" : "LOW"}
              delta={`${positions.length} open positions`}
              tone={
                positions.length > 5
                  ? "negative"
                  : positions.length > 2
                    ? "warning"
                    : "positive"
              }
              icon={Shield}
            />
            <MetricCard
              label="Win Rate"
              value={winRate != null ? formatPercent(winRate) : "—"}
              delta={`${transactions.filter((t) => t.side === "SELL").length} closed trades`}
              tone={
                winRate == null
                  ? "neutral"
                  : winRate >= 0.6
                    ? "positive"
                    : winRate >= 0.4
                      ? "warning"
                      : "negative"
              }
              icon={BarChart3}
            />
            <MetricCard
              label="Max Drawdown"
              value={`-${formatPercent(maxDrawdown)}`}
              delta="Peak to trough"
              tone={maxDrawdown > 0.1 ? "negative" : maxDrawdown > 0.05 ? "warning" : "positive"}
              icon={TrendingDown}
            />
          </section>
        </AnimatedSection>

        {/* ── 2. Equity Chart + Order Entry ──────────── */}
        <div className="grid gap-6 xl:grid-cols-12">
          <AnimatedSection id="equity" className="h-full xl:col-span-8">
            <EquityChart data={initialEquitySeries} />
          </AnimatedSection>
          <AnimatedSection id="transactions" className="h-full xl:col-span-4">
            <TransactionForm onCreate={handleCreateTransaction} />
          </AnimatedSection>
        </div>

        {/* ── 3. Analytics Grid (2×2) ────────────────── */}
        <AnimatedSection id="analytics" className="mt-6">
          <section className="grid gap-4 md:grid-cols-2">
            <SignalFeed signals={initialSignalNotifications} />
            <SectorExposure positions={positions} sectorMap={sectorMap} />
            <SignalHeatmap signals={initialSignalNotifications} />
            <StrategyStats
              transactions={transactions}
              equitySeries={initialEquitySeries}
            />
          </section>
        </AnimatedSection>

        {/* ── 4. Portfolio ───────────────────────────── */}
        <div className="mt-6">
          <AnimatedSection id="portfolio">
            <PortfolioTable transactions={transactions} marketPrices={marketPrices} />
          </AnimatedSection>
        </div>

        {/* ── 5. Journal (Trade Journal + Cash Flow) ── */}
        <div className="mt-6">
          <AnimatedSection id="journal">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Journal</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="trades" className="gap-4">
                  <TabsList>
                    <TabsTrigger value="trades">Trade Journal</TabsTrigger>
                    <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                  </TabsList>
                  <TabsContent value="trades">
                    <TradeJournal transactions={transactions} />
                  </TabsContent>
                  <TabsContent value="cashflow">
                    <DepositWithdrawalJournal
                      entries={cashJournal}
                      onCreate={handleCreateCashEntry}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}
