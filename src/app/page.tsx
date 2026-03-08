"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, ChartCandlestick, Wallet } from "lucide-react";

import { DciLogo } from "@/components/brand/dci-logo";
import { AnimatedSection } from "@/components/dashboard/animated-section";
import { DepositWithdrawalJournal } from "@/components/dashboard/deposit-withdrawal-journal";
import { EquityChart } from "@/components/dashboard/equity-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import {
  initialCashJournal,
  initialEquitySeries,
  initialTransactions,
  marketPrices,
} from "@/lib/mock-data";
import {
  fetchSignalNotifications,
  getDefaultSignalNotifications,
} from "@/lib/signal-notifications";
import { supabase } from "@/lib/supabase/client";
import type { CashFlowEntry, SignalNotification, Transaction } from "@/lib/types";

const SHARES_PER_LOT = 100;

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [cashJournal, setCashJournal] = useState<CashFlowEntry[]>(initialCashJournal);
  const [signalNotifications, setSignalNotifications] = useState<SignalNotification[]>(
    getDefaultSignalNotifications
  );

  const latestEquity = initialEquitySeries[initialEquitySeries.length - 1]?.equity ?? 0;
  const previousEquity = initialEquitySeries[initialEquitySeries.length - 2]?.equity ?? 0;
  const dailyPnl = initialEquitySeries[initialEquitySeries.length - 1]?.dailyPnl ?? 0;
  const dayChange = latestEquity - previousEquity;
  const dayChangePercent = previousEquity > 0 ? dayChange / previousEquity : 0;

  const netCashFlow = useMemo(
    () =>
      cashJournal.reduce((sum, entry) => {
        if (entry.type === "DEPOSIT") return sum + entry.amount;
        if (entry.type === "WITHDRAWAL") return sum - entry.amount;
        return sum + entry.amount;
      }, 0),
    [cashJournal]
  );

  const tradedVolume = useMemo(
    () =>
      transactions.reduce(
        (sum, trade) => sum + trade.quantity * SHARES_PER_LOT * trade.price,
        0
      ),
    [transactions]
  );

  const activeTickers = useMemo(
    () => new Set(transactions.map((trade) => trade.ticker)).size,
    [transactions]
  );

  async function persistTransaction(trade: Transaction) {
    if (!supabase) return;

    const { error } = await supabase.from("transactions").insert({
      id: trade.id,
      date: trade.date,
      ticker: trade.ticker,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      fee: trade.fee,
      note: trade.note ?? null,
    });

    if (error) {
      console.error("Supabase insert failed for transaction:", error.message);
    }
  }

  async function persistCashEntry(entry: CashFlowEntry) {
    if (!supabase) return;

    const { error } = await supabase.from("cash_journal").insert({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
      note: entry.note ?? null,
    });

    if (error) {
      console.error("Supabase insert failed for cash journal:", error.message);
    }
  }

  function handleCreateTransaction(transaction: Transaction) {
    setTransactions((current) => [transaction, ...current]);
    void persistTransaction(transaction);
  }

  function handleCreateCashEntry(entry: CashFlowEntry) {
    setCashJournal((current) => [entry, ...current]);
    void persistCashEntry(entry);
  }

  const loadSignalNotifications = useCallback(async () => {
    try {
      const latest = await fetchSignalNotifications();
      setSignalNotifications(latest);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected fetch error";
      console.error("Supabase load failed for signal notifications:", message);
      return;
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void loadSignalNotifications();
    };

    const initialTimer = window.setTimeout(run, 0);
    const intervalTimer = window.setInterval(run, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, [loadSignalNotifications]);

  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <DciLogo />
          <div className="flex items-center gap-2">
            <NotificationBell notifications={signalNotifications} />
            <ThemeToggle />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <AnimatedSection id="equity" className="h-full xl:col-span-8">
            <EquityChart data={initialEquitySeries} />
          </AnimatedSection>
          <AnimatedSection id="transactions" className="h-full xl:col-span-4">
            <TransactionForm onCreate={handleCreateTransaction} />
          </AnimatedSection>
        </div>

        <AnimatedSection id="metrics" className="mt-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Equity"
              value={formatCompactCurrency(latestEquity)}
              delta={`${dayChange >= 0 ? "+" : ""}${formatCurrency(dayChange)} (${formatPercent(dayChangePercent)})`}
              tone={dayChange >= 0 ? "positive" : "negative"}
              icon={Wallet}
            />
            <MetricCard
              title="Daily P/L"
              value={formatCurrency(dailyPnl)}
              delta={dailyPnl >= 0 ? "Daily Profit" : "Daily Loss"}
              tone={dailyPnl >= 0 ? "positive" : "negative"}
              icon={Activity}
            />
            <MetricCard
              title="Net Cash Flow"
              value={formatCompactCurrency(netCashFlow)}
              delta="Deposits, withdrawals, adjustments"
              tone={netCashFlow >= 0 ? "positive" : "negative"}
              icon={ArrowUpRight}
            />
            <MetricCard
              title="Trading Exposure"
              value={formatCompactCurrency(tradedVolume)}
              delta={`${activeTickers} active IDX tickers`}
              tone="neutral"
              icon={ChartCandlestick}
            />
          </section>
        </AnimatedSection>

        <div className="mt-6 space-y-6">
          <AnimatedSection id="portfolio">
            <PortfolioTable transactions={transactions} marketPrices={marketPrices} />
          </AnimatedSection>
          <AnimatedSection id="journal">
            <DepositWithdrawalJournal
              entries={cashJournal}
              onCreate={handleCreateCashEntry}
            />
          </AnimatedSection>
        </div>
      </main>
    </div>
  );
}
