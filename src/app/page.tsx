"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  LineChart,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AnimatedSection } from "@/components/dashboard/animated-section";
import { DepositWithdrawalJournal } from "@/components/dashboard/deposit-withdrawal-journal";
import { EquityChart } from "@/components/dashboard/equity-chart";
import { InitialCapitalPrompt } from "@/components/dashboard/initial-capital-prompt";
import { ExportButton } from "@/components/export/export-button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { SectorExposure } from "@/components/dashboard/sector-exposure";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { SignalHeatmap } from "@/components/dashboard/signal-heatmap";
import { StrategyStats } from "@/components/dashboard/strategy-stats";
import { TradeJournal } from "@/components/dashboard/trade-journal";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShellHeader } from "@/components/layout/app-shell-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import {
  ApiError,
  createCashJournalEntry,
  createTransaction,
  deletePriceTarget,
  fetchCashJournal,
  fetchPriceTargets,
  fetchSignalNotifications,
  fetchTradingSignals,
  fetchTransactions,
  upsertPriceTarget,
  updateTradingSignalStatus,
} from "@/lib/api-client";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { useExport } from "@/lib/hooks/useExport";
import { useBenchmarkData } from "@/lib/hooks/useBenchmarkData";
import { useMarketData } from "@/lib/hooks/useMarketData";
import { getBenchmarkReturn } from "@/lib/benchmark";
import { formatRelativeMarketUpdate } from "@/lib/market";
import { getAvailableCash } from "@/lib/portfolio";
import {
  calculateWinRateStats,
  SMALL_SAMPLE_WIN_RATE_NOTE,
} from "@/lib/win-rate";
import {
  initialCashJournal,
  initialEquitySeries,
  initialSignalNotifications,
  initialTransactions,
  marketPrices as fallbackMarketPrices,
} from "@/lib/mock-data";
import { stockUniverse } from "@/lib/stock-universe";
import {
  calculateBrokerFee,
  SHARES_PER_LOT,
} from "@/lib/trading";
import type {
  CashFlowEntry,
  CashFlowEntryInput,
  PriceTargetWatch,
  SignalExecutionPrefill,
  SignalNotification,
  TradingSignal,
  Transaction,
  TransactionInput,
} from "@/lib/types";

function buildFallbackTradingSignals(
  notifications: SignalNotification[]
): TradingSignal[] {
  return notifications.map((signal) => ({
    ...signal,
    signalTs: signal.createdAt,
    status: signal.isRead ? "DISMISSED" : "ACTIVE",
    actionDate: signal.isRead ? signal.createdAt : null,
    currentPrice: null,
    linkedTransactionId: null,
    regime: null,
    tradeTicket: null,
  }));
}

type SyncToastKey = "core" | "notifications" | "signals";

export default function HomePage() {
  const { showToast } = useToast();
  const { role, user } = useAuth();
  const syncToastStateRef = useRef<Record<SyncToastKey, boolean>>({
    core: false,
    notifications: false,
    signals: false,
  });
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [cashJournal, setCashJournal] = useState<CashFlowEntry[]>(initialCashJournal);
  const [notifications, setNotifications] =
    useState<SignalNotification[]>(initialSignalNotifications);
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>(
    buildFallbackTradingSignals(initialSignalNotifications)
  );
  const [priceTargets, setPriceTargets] = useState<PriceTargetWatch[]>([]);
  const [signalCount, setSignalCount] = useState(
    initialSignalNotifications.filter((signal) => !signal.isRead).length
  );
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [executingSignal, setExecutingSignal] = useState<SignalExecutionPrefill | null>(null);
  const [signalRefreshNonce, setSignalRefreshNonce] = useState(0);
  const [hasLoadedRemoteCoreData, setHasLoadedRemoteCoreData] = useState(false);
  const [hasLoadedRemoteNotifications, setHasLoadedRemoteNotifications] = useState(false);
  const [hasLoadedRemoteSignals, setHasLoadedRemoteSignals] = useState(false);

  const displayTransactions = useMemo(
    () => (user ? (hasLoadedRemoteCoreData ? transactions : []) : transactions),
    [hasLoadedRemoteCoreData, transactions, user]
  );
  const displayCashJournal = useMemo(
    () => (user ? (hasLoadedRemoteCoreData ? cashJournal : []) : cashJournal),
    [cashJournal, hasLoadedRemoteCoreData, user]
  );
  const displayNotifications = useMemo(
    () => (user ? (hasLoadedRemoteNotifications ? notifications : []) : notifications),
    [hasLoadedRemoteNotifications, notifications, user]
  );
  const displayTradingSignals = useMemo(
    () => (user ? (hasLoadedRemoteSignals ? tradingSignals : []) : tradingSignals),
    [hasLoadedRemoteSignals, tradingSignals, user]
  );
  const displaySignalCount = useMemo(
    () => (user ? (hasLoadedRemoteNotifications ? signalCount : 0) : signalCount),
    [hasLoadedRemoteNotifications, signalCount, user]
  );

  const trackedTickers = useMemo(
    () =>
      Array.from(
        new Set([
          ...displayTransactions.map((transaction) => transaction.ticker),
          ...displayTradingSignals.map((signal) => signal.ticker),
        ])
      ),
    [displayTradingSignals, displayTransactions]
  );

  const {
    snapshots: marketSnapshots,
    priceMap: liveMarketPrices,
    isLoading: isMarketLoading,
    isMarketOpen,
    marketStatusLabel,
    lastUpdatedAt,
    hasDelayedData,
  } = useMarketData(trackedTickers);

  const marketPrices = useMemo(
    () => ({ ...fallbackMarketPrices, ...liveMarketPrices }),
    [liveMarketPrices]
  );

  const equitySeries = useMemo(() => {
    if (displayTransactions.length === 0 && displayCashJournal.length === 0) {
      return user ? [] : initialEquitySeries;
    }

    const events = [
      ...displayCashJournal.map((entry) => ({ date: entry.date, type: "CASH" as const, data: entry })),
      ...displayTransactions.map((transaction) => ({
        date: transaction.date,
        type: "TX" as const,
        data: transaction,
      })),
    ].sort((left, right) => left.date.localeCompare(right.date));

    if (events.length === 0) return user ? [] : initialEquitySeries;

    const startDate = new Date(events[0].date);
    const today = new Date();
    const dates: string[] = [];
    const cursor = new Date(startDate);

    while (cursor <= today) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const todayKey = today.toISOString().slice(0, 10);
    if (!dates.includes(todayKey)) dates.push(todayKey);

    let cash = 0;
    let startingEquity = 0;
    const holdings = new Map<string, number>();
    const points: typeof initialEquitySeries = [];
    let eventIndex = 0;
    let previousEquity = 0;

    for (const date of dates) {
      while (eventIndex < events.length && events[eventIndex].date <= date) {
        const event = events[eventIndex];
        if (event.type === "CASH") {
          const entry = event.data as CashFlowEntry;
          if (entry.type === "DEPOSIT" || entry.type === "DIVIDEND") {
            cash += Math.abs(entry.amount);
          } else if (entry.type === "WITHDRAWAL") {
            cash -= Math.abs(entry.amount);
          } else {
            cash += entry.amount;
          }

          if (startingEquity === 0 && entry.type === "DEPOSIT") {
            startingEquity = Math.abs(entry.amount);
          }
        } else {
          const transaction = event.data as Transaction;
          const gross = transaction.quantity * SHARES_PER_LOT * transaction.price;
          if (transaction.side === "BUY") {
            cash -= gross + transaction.fee;
            holdings.set(
              transaction.ticker,
              (holdings.get(transaction.ticker) ?? 0) + transaction.quantity
            );
          } else {
            cash += gross - transaction.fee;
            const nextLots = (holdings.get(transaction.ticker) ?? 0) - transaction.quantity;
            holdings.set(transaction.ticker, Math.max(0, nextLots));
          }
        }

        eventIndex += 1;
      }

      let portfolioValue = cash;
      for (const [ticker, lots] of Array.from(holdings.entries())) {
        portfolioValue += lots * SHARES_PER_LOT * (marketPrices[ticker] || 0);
      }

      points.push({
        date,
        equity: portfolioValue,
        pnl: startingEquity > 0 ? portfolioValue - startingEquity : 0,
        dailyPnl: previousEquity > 0 ? portfolioValue - previousEquity : 0,
      });

      previousEquity = portfolioValue;
    }

    return points.length > 0 ? points : user ? [] : initialEquitySeries;
  }, [displayCashJournal, displayTransactions, marketPrices, user]);

  const latestEquity = equitySeries[equitySeries.length - 1]?.equity ?? 0;
  const previousEquity = equitySeries[equitySeries.length - 2]?.equity ?? 0;
  const startingEquity = equitySeries[0]?.equity ?? 0;
  const dailyPnl = equitySeries[equitySeries.length - 1]?.dailyPnl ?? 0;
  const dayChange = latestEquity - previousEquity;
  const portfolioReturn =
    startingEquity > 0 ? (latestEquity - startingEquity) / startingEquity : null;
  const benchmarkStartDate = equitySeries[0]?.date;
  const benchmarkEndDate = equitySeries[equitySeries.length - 1]?.date;
  const {
    benchmarkSeries,
    isLoading: isBenchmarkLoading,
  } = useBenchmarkData(benchmarkStartDate, benchmarkEndDate);
  const benchmarkReturn = useMemo(
    () =>
      benchmarkStartDate && benchmarkEndDate
        ? getBenchmarkReturn(benchmarkSeries, benchmarkStartDate, benchmarkEndDate)
        : null,
    [benchmarkEndDate, benchmarkSeries, benchmarkStartDate]
  );
  const alphaVsIhsg =
    portfolioReturn != null && benchmarkReturn != null
      ? portfolioReturn - benchmarkReturn
      : null;
  const availableCash = useMemo(
    () => getAvailableCash(displayCashJournal, displayTransactions),
    [displayCashJournal, displayTransactions]
  );

  const equitySparkData = useMemo(
    () => equitySeries.slice(-30).map((point) => point.equity),
    [equitySeries]
  );
  const pnlSparkData = useMemo(
    () => equitySeries.slice(-30).map((point) => point.dailyPnl),
    [equitySeries]
  );

  const maxDrawdown = useMemo(() => {
    let peak = 0;
    let worst = 0;
    for (const point of equitySeries) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
      if (drawdown > worst) worst = drawdown;
    }
    return worst;
  }, [equitySeries]);

  const winRateStats = useMemo(
    () => calculateWinRateStats(displayTransactions),
    [displayTransactions]
  );

  const activeSignals = displayTradingSignals.filter((signal) => signal.status === "ACTIVE").length;
  const hasInitialCapital = useMemo(
    () =>
      displayCashJournal.some(
        (entry) => entry.type === "DEPOSIT" && Math.abs(entry.amount) > 0
      ),
    [displayCashJournal]
  );

  const positions = useMemo(() => {
    const positionMap = new Map<string, { quantity: number; costBasis: number }>();

    for (const trade of displayTransactions) {
      const current = positionMap.get(trade.ticker) ?? { quantity: 0, costBasis: 0 };
      if (trade.side === "BUY") {
        current.quantity += trade.quantity;
        current.costBasis += trade.quantity * SHARES_PER_LOT * trade.price + trade.fee;
      } else {
        const sellLots = Math.min(trade.quantity, current.quantity);
        const averageCostPerLot = current.quantity > 0 ? current.costBasis / current.quantity : 0;
        current.quantity -= sellLots;
        current.costBasis = Math.max(0, current.costBasis - averageCostPerLot * sellLots);
      }
      positionMap.set(trade.ticker, current);
    }

    return Array.from(positionMap.entries())
      .filter(([, value]) => value.quantity > 0)
      .map(([ticker, value]) => ({
        ticker,
        quantity: value.quantity,
        marketValue: value.quantity * SHARES_PER_LOT * (marketPrices[ticker] ?? 0),
      }));
  }, [displayTransactions, marketPrices]);

  const liveDailyPnl = useMemo(
    () =>
      positions.reduce((sum, position) => {
        const snapshot = marketSnapshots[position.ticker];
        if (!snapshot) return sum;
        return sum + snapshot.change * position.quantity * SHARES_PER_LOT;
      }, 0),
    [marketSnapshots, positions]
  );
  const displayedDailyPnl =
    Object.keys(marketSnapshots).length > 0 ? liveDailyPnl : dailyPnl;

  const sectorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const stock of stockUniverse) {
      map[stock.ticker] = stock.sector;
    }
    return map;
  }, []);

  const marketRefreshLabel = formatRelativeMarketUpdate(lastUpdatedAt);
  const isViewer = role === "viewer";
  const readOnlyReason = "Read-only access. Viewer accounts cannot write orders or cash entries.";
  const activeExecutingSignal = useMemo(() => {
    if (!executingSignal) return null;

    const matchingSignal = displayTradingSignals.find((signal) => signal.id === executingSignal.signalId);
    if (!matchingSignal || matchingSignal.status !== "ACTIVE") {
      return null;
    }

    return executingSignal;
  }, [displayTradingSignals, executingSignal]);
  const {
    generateExport,
    isExporting,
    exportError,
  } = useExport({
    transactions: displayTransactions,
    cashJournal: displayCashJournal,
    equitySeries,
    benchmarkSeries,
    marketPrices,
    marketData: marketSnapshots,
    activeSignalCount: activeSignals,
  });

  function resetSyncToast(key: SyncToastKey) {
    syncToastStateRef.current[key] = false;
  }

  function showSyncToast(key: SyncToastKey, title: string, description: string) {
    if (syncToastStateRef.current[key]) return;
    syncToastStateRef.current[key] = true;
    showToast({
      tone: "warning",
      title,
      description,
    });
  }

  async function handleCreateTransaction(input: TransactionInput) {
    try {
      const created = await createTransaction(input);
      setTransactions((current) => [created, ...current]);
      setHasLoadedRemoteCoreData(true);
      setSyncNotice("");

      if (input.signalId) {
        const actionDate = new Date().toISOString();
        setTradingSignals((current) =>
          current.map((signal) =>
            signal.id === input.signalId
              ? {
                  ...signal,
                  status: "EXECUTED",
                  actionDate,
                  linkedTransactionId: created.id,
                }
              : signal
          )
        );
        setSignalRefreshNonce((current) => current + 1);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const fallback: Transaction = {
          id: crypto.randomUUID(),
          date: input.date,
          ticker: input.ticker,
          side: input.side,
          strategy: input.strategy,
          quantity: input.quantity,
          price: input.price,
          fee: calculateBrokerFee(input.side, input.quantity, input.price),
          note: input.note,
        };
        setTransactions((current) => [fallback, ...current]);

        if (input.signalId) {
          const actionDate = new Date().toISOString();
          setTradingSignals((current) =>
            current.map((signal) =>
              signal.id === input.signalId
                ? {
                    ...signal,
                    status: "EXECUTED",
                    actionDate,
                    linkedTransactionId: fallback.id,
                  }
                : signal
            )
          );
        }

        setSyncNotice("Not signed in. Order was saved locally only.");
        return;
      }
      throw error instanceof Error ? error : new Error("Failed to save transaction.");
    }
  }

  async function handleCreateCashEntry(input: CashFlowEntryInput) {
    try {
      const created = await createCashJournalEntry(input);
      setCashJournal((current) => [created, ...current]);
      setHasLoadedRemoteCoreData(true);
      setSyncNotice("");
      showToast({
        tone: "success",
        title: "Cash entry saved",
        description: `${created.type} ${formatCurrency(created.amount)} has been recorded.`,
      });
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
        setSyncNotice("Not signed in. Cash entry was saved locally only.");
        showToast({
          tone: "warning",
          title: "Saved locally only",
          description: "Sign in to sync this cash entry with Supabase.",
        });
        return;
      }
      throw error instanceof Error ? error : new Error("Failed to save cash entry.");
    }
  }

  const loadCoreData = useEffectEvent(async () => {
    try {
      const [remoteTransactions, remoteCashJournal] = await Promise.all([
        fetchTransactions(),
        fetchCashJournal(),
      ]);
      setTransactions(remoteTransactions);
      setCashJournal(remoteCashJournal);
      setHasLoadedRemoteCoreData(true);
      setSyncNotice("");
      resetSyncToast("core");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setHasLoadedRemoteCoreData(false);
        setSyncNotice("Sign in to sync transactions and cash journal with Supabase.");
        resetSyncToast("core");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to sync data.";
      console.error("Failed to sync core data:", message);
      showSyncToast(
        "core",
        "Portfolio sync delayed",
        "Transactions and cash journal are temporarily using the latest cached view."
      );
    }
  });

  const loadSignalNotifications = useEffectEvent(async () => {
    try {
      const remoteSignals = await fetchSignalNotifications(50);
      setNotifications(remoteSignals);
      setSignalCount(remoteSignals.filter((signal) => !signal.isRead).length);
      setHasLoadedRemoteNotifications(true);
      resetSyncToast("notifications");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setNotifications(initialSignalNotifications);
        setSignalCount(initialSignalNotifications.filter((signal) => !signal.isRead).length);
        setHasLoadedRemoteNotifications(false);
        resetSyncToast("notifications");
        return;
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("Failed to load signal notifications:", message);
      showSyncToast(
        "notifications",
        "Notification sync delayed",
        "Recent signal notifications may be briefly out of date while the connection recovers."
      );
    }
  });

  const loadTradingSignals = useEffectEvent(async () => {
    try {
      const remoteSignals = await fetchTradingSignals(80);
      setTradingSignals(remoteSignals);
      setHasLoadedRemoteSignals(true);
      resetSyncToast("signals");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setTradingSignals(buildFallbackTradingSignals(initialSignalNotifications));
        setHasLoadedRemoteSignals(false);
        resetSyncToast("signals");
        return;
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("Failed to load trading signals:", message);
      showSyncToast(
        "signals",
        "Signal feed delayed",
        "Active quant signals are temporarily using the latest available snapshot."
      );
    }
  });

  const loadPriceTargets = useEffectEvent(async () => {
    try {
      const remoteTargets = await fetchPriceTargets();
      setPriceTargets(remoteTargets);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPriceTargets([]);
        return;
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("Failed to load price targets:", message);
      showSyncToast(
        "notifications",
        "Price target sync delayed",
        "Saved target alerts are temporarily unavailable while the connection recovers."
      );
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCoreData();
      void loadSignalNotifications();
      void loadTradingSignals();
      void loadPriceTargets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadSignalNotifications();
      void loadTradingSignals();
      void loadPriceTargets();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (signalRefreshNonce === 0) return;
    void loadTradingSignals();
  }, [signalRefreshNonce]);

  function handleExecuteSignal(signal: TradingSignal) {
    if (signal.type !== "BUY" && signal.type !== "SELL") return;

    const targetEntry = signal.tradeTicket?.targetEntry ?? null;
    const marketPrice = marketSnapshots[signal.ticker]?.price ?? marketPrices[signal.ticker] ?? 0;

    setExecutingSignal({
      signalId: signal.id,
      ticker: signal.ticker,
      side: signal.type,
      price: targetEntry ?? marketPrice,
    });

    window.requestAnimationFrame(() => {
      document.getElementById("transactions")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleDismissSignal(signalId: string) {
    const previousSignals = tradingSignals;
    const actionDate = new Date().toISOString();

    setTradingSignals((current) =>
      current.map((signal) =>
        signal.id === signalId
          ? { ...signal, status: "DISMISSED", actionDate }
          : signal
      )
    );
    if (executingSignal?.signalId === signalId) {
      setExecutingSignal(null);
    }

    try {
      await updateTradingSignalStatus(signalId, "DISMISSED");
      setSyncNotice("");
      setSignalRefreshNonce((current) => current + 1);
      showToast({
        tone: "success",
        title: "Signal dismissed",
        description: "The signal was moved out of the active queue.",
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSyncNotice("Not signed in. Signal action was stored locally only.");
        showToast({
          tone: "warning",
          title: "Stored locally only",
          description: "Sign in to persist this signal action to Supabase.",
        });
        return;
      }

      setTradingSignals(previousSignals);
      const message =
        error instanceof Error ? error.message : "Failed to update signal status.";
      setSyncNotice(message);
      showToast({
        tone: "error",
        title: "Signal update failed",
        description: message,
      });
    }
  }

  async function handleSavePriceTarget(input: {
    ticker: string;
    targetPrice: number;
    currentPrice: number | null;
  }) {
    const savedTarget = await upsertPriceTarget(input);
    if (!savedTarget) {
      throw new Error("Price target could not be saved.");
    }

    setPriceTargets((current) => [
      savedTarget,
      ...current.filter((target) => target.ticker !== savedTarget.ticker),
    ]);
    resetSyncToast("notifications");
    showToast({
      tone: "success",
      title: "Price target saved",
      description: `${savedTarget.ticker} will alert at ${formatCurrency(savedTarget.targetPrice)}.`,
    });
  }

  async function handleClearPriceTarget(ticker: string) {
    await deletePriceTarget(ticker);
    setPriceTargets((current) => current.filter((target) => target.ticker !== ticker));
    resetSyncToast("notifications");
    showToast({
      tone: "success",
      title: "Price target cleared",
      description: `${ticker} no longer has an active price alert.`,
    });
  }

  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_50%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_8%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        <AppShellHeader
          unreadCount={displaySignalCount}
          recentSignals={displayNotifications}
          actions={() => (
            <ExportButton
              onGenerate={generateExport}
              isExporting={isExporting}
              error={exportError}
            />
          )}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
              isMarketOpen
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-border/70 bg-card/60 text-muted-foreground"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isMarketOpen ? "animate-pulse bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            {marketStatusLabel}
          </span>
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-muted-foreground">
            {isMarketLoading && !lastUpdatedAt ? "Syncing prices..." : marketRefreshLabel}
          </span>
          {hasDelayedData ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-300">
              Data delayed
            </span>
          ) : null}
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-muted-foreground">
            Sources: live prices every {isMarketOpen ? "60s" : "10m"}
          </span>
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-muted-foreground">
            Available Cash: {formatCurrency(availableCash)}
          </span>
        </div>

        {syncNotice ? <p className="mb-3 text-sm text-amber-500">{syncNotice}</p> : null}
        {user && hasLoadedRemoteCoreData && !hasInitialCapital ? (
          <InitialCapitalPrompt
            onCreate={handleCreateCashEntry}
            disabled={isViewer}
            readOnlyReason={readOnlyReason}
          />
        ) : null}

        <AnimatedSection id="metrics" className="mb-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <MetricCard
              label="Portfolio Value"
              value={formatCompactCurrency(latestEquity)}
              delta={`${dayChange >= 0 ? "+" : ""}${formatCurrency(dayChange)}`}
              tone={dayChange >= 0 ? "positive" : "negative"}
              icon={Wallet}
              sparkData={equitySparkData}
              helpText="Total current equity across cash and open positions using the latest available market marks."
            />
            <MetricCard
              label="Portfolio Return"
              value={portfolioReturn != null ? formatPercent(portfolioReturn) : "N/A"}
              delta={`${formatCompactCurrency(latestEquity - startingEquity)} total`}
              tone={
                portfolioReturn == null
                  ? "neutral"
                  : portfolioReturn >= 0
                    ? "positive"
                    : "negative"
              }
              icon={LineChart}
              helpText="Change in total portfolio equity versus the starting equity baseline recorded in the selected data series."
            />
            <MetricCard
              label="Alpha vs IHSG"
              value={alphaVsIhsg != null ? formatPercent(alphaVsIhsg) : "N/A"}
              delta={
                isBenchmarkLoading
                  ? "Syncing IHSG benchmark"
                  : benchmarkReturn != null
                    ? `IHSG ${formatPercent(benchmarkReturn)}`
                    : "Benchmark unavailable"
              }
              tone={
                alphaVsIhsg == null
                  ? "neutral"
                  : alphaVsIhsg >= 0
                    ? "positive"
                    : "negative"
              }
              icon={TrendingUp}
              helpText="Relative outperformance versus IHSG over the same period. Formula: Portfolio Return - IHSG Return."
            />
            <MetricCard
              label="Daily P/L"
              value={formatCurrency(displayedDailyPnl)}
              delta={
                Object.keys(marketSnapshots).length > 0
                  ? displayedDailyPnl >= 0
                    ? "Live mark-to-market"
                    : "Live intraday drawdown"
                  : displayedDailyPnl >= 0
                    ? "Daily Profit"
                    : "Daily Loss"
              }
              tone={displayedDailyPnl >= 0 ? "positive" : "negative"}
              icon={Activity}
              sparkData={pnlSparkData}
              helpText="Intraday mark-to-market profit and loss from live price changes across current open positions."
            />
            <MetricCard
              label="Active Signals"
              value={String(activeSignals)}
              delta={activeSignals > 0 ? "New signals" : "No new signals"}
              tone={activeSignals > 0 ? "warning" : "neutral"}
              icon={Target}
              pulse={activeSignals > 0}
              helpText="Signals from the QuantLite pipeline that are still active and have not been executed, dismissed, or expired."
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
              helpText="A quick concentration proxy based on the number of simultaneously open positions. It is directional, not a formal VaR model."
            />
            <MetricCard
              label="Win Rate"
              value={
                winRateStats.closedTrades > 0 && winRateStats.winRate != null
                  ? `${formatPercent(winRateStats.winRate)}${winRateStats.hasSmallSample ? "*" : ""}`
                  : "N/A"
              }
              delta={
                winRateStats.closedTrades > 0
                  ? `n=${winRateStats.closedTrades} closed trade${winRateStats.closedTrades === 1 ? "" : "s"}`
                  : "No closed trades yet"
              }
              tone={
                winRateStats.closedTrades === 0 || winRateStats.hasSmallSample || winRateStats.winRate == null
                  ? "neutral"
                  : winRateStats.winRate >= 0.6
                    ? "positive"
                    : winRateStats.winRate >= 0.4
                      ? "warning"
                      : "negative"
              }
              icon={BarChart3}
              helpText="Winning closed trades divided by total closed trades. Results with fewer than 3 closed trades are shown with an asterisk because the sample is statistically insignificant."
            />
            <MetricCard
              label="Max Drawdown"
              value={`-${formatPercent(maxDrawdown)}`}
              delta="Peak to trough"
              tone={maxDrawdown > 0.1 ? "negative" : maxDrawdown > 0.05 ? "warning" : "positive"}
              icon={TrendingDown}
              helpText="Maximum observed decline from a prior portfolio equity peak to the following trough. Formula: (Peak Equity - Trough Equity) / Peak Equity."
            />
          </section>
        </AnimatedSection>
        {winRateStats.hasSmallSample ? (
          <p className="mt-3 text-xs text-muted-foreground">{SMALL_SAMPLE_WIN_RATE_NOTE}</p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-12">
          <AnimatedSection id="equity" className="h-full xl:col-span-8">
            <EquityChart
              data={equitySeries}
              benchmarkSeries={benchmarkSeries}
              isBenchmarkLoading={isBenchmarkLoading}
            />
          </AnimatedSection>
          <AnimatedSection id="transactions" className="h-full xl:col-span-4">
            <TransactionForm
              transactions={displayTransactions}
              availableCash={availableCash}
              onCreate={handleCreateTransaction}
              disabled={isViewer}
              readOnlyReason={readOnlyReason}
              signalPrefill={activeExecutingSignal}
              onClearSignalPrefill={() => setExecutingSignal(null)}
            />
          </AnimatedSection>
        </div>

        <AnimatedSection id="analytics" className="mt-6">
          <section className="grid gap-4 md:grid-cols-2">
            <SignalFeed
              signals={displayTradingSignals}
              marketData={marketSnapshots}
              marketPrices={marketPrices}
              transactions={displayTransactions}
              onExecuteSignal={handleExecuteSignal}
              onDismissSignal={handleDismissSignal}
              disabled={isViewer}
              readOnlyReason={readOnlyReason}
              pendingSignalId={activeExecutingSignal?.signalId ?? null}
            />
            <SectorExposure positions={positions} sectorMap={sectorMap} />
            <SignalHeatmap signals={displayTradingSignals} />
            <StrategyStats transactions={displayTransactions} equitySeries={equitySeries} />
          </section>
        </AnimatedSection>

        <div className="mt-6">
          <AnimatedSection id="portfolio">
            <PortfolioTable
              transactions={displayTransactions}
              marketPrices={marketPrices}
              marketData={marketSnapshots}
              priceTargets={priceTargets}
              onSavePriceTarget={handleSavePriceTarget}
              onClearPriceTarget={handleClearPriceTarget}
            />
          </AnimatedSection>
        </div>

        <div className="mt-6">
          <AnimatedSection id="journal">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Journal</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="trades" className="gap-4">
                  <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
                    <TabsTrigger value="trades">Trade Journal</TabsTrigger>
                    <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                  </TabsList>
                  <TabsContent value="trades">
                    <TradeJournal transactions={displayTransactions} />
                  </TabsContent>
                  <TabsContent value="cashflow">
                    <DepositWithdrawalJournal
                      entries={displayCashJournal}
                      transactions={displayTransactions}
                      onCreate={handleCreateCashEntry}
                      disabled={isViewer}
                      readOnlyReason={readOnlyReason}
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
