"use client";

import type {
  AppNotification,
  CashFlowEntry,
  CashFlowEntryInput,
  PriceTargetWatch,
  SignalNotification,
  TradingSignal,
  Transaction,
  TransactionInput,
} from "@/lib/types";
import type { MarketPriceSnapshot } from "@/lib/market";
import type { BenchmarkPoint } from "@/lib/benchmark";

interface ApiErrorOptions {
  message: string;
  status: number;
}

export class ApiError extends Error {
  status: number;

  constructor({ message, status }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; code?: string };
    return payload.error ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

async function requestJson<T>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError({ status: response.status, message });
  }

  return (await response.json()) as T;
}

export async function fetchTransactions(limit = 200): Promise<Transaction[]> {
  const payload = await requestJson<{ transactions: Transaction[] }>(
    `/api/transactions?limit=${limit}`
  );
  return payload.transactions;
}

export async function createTransaction(
  input: TransactionInput
): Promise<Transaction> {
  const payload = await requestJson<{ transaction: Transaction }>(
    "/api/transactions",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return payload.transaction;
}

export async function fetchCashJournal(limit = 200): Promise<CashFlowEntry[]> {
  const payload = await requestJson<{ entries: CashFlowEntry[] }>(
    `/api/cash-journal?limit=${limit}`
  );
  return payload.entries;
}

export async function createCashJournalEntry(
  input: CashFlowEntryInput
): Promise<CashFlowEntry> {
  const payload = await requestJson<{ entry: CashFlowEntry }>(
    "/api/cash-journal",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return payload.entry;
}

export async function fetchSignalNotifications(
  limit = 120
): Promise<SignalNotification[]> {
  const payload = await requestJson<{ notifications: SignalNotification[] }>(
    `/api/signal-notifications?limit=${limit}`
  );
  return payload.notifications;
}

export async function fetchTradingSignals(limit = 50): Promise<TradingSignal[]> {
  const payload = await requestJson<{ signals: TradingSignal[] }>(
    `/api/signals?limit=${limit}`
  );
  return payload.signals;
}

export async function fetchNotifications(limit = 20): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  return requestJson<{ notifications: AppNotification[]; unreadCount: number }>(
    `/api/notifications?limit=${limit}`
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ markAll: true }),
  });
}

export async function fetchPriceTargets(): Promise<PriceTargetWatch[]> {
  const payload = await requestJson<{ targets: PriceTargetWatch[] }>(
    "/api/price-targets"
  );
  return payload.targets;
}

export async function upsertPriceTarget(input: {
  ticker: string;
  targetPrice: number;
  currentPrice?: number | null;
}): Promise<PriceTargetWatch | null> {
  const payload = await requestJson<{ target: PriceTargetWatch | null }>(
    "/api/price-targets",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return payload.target;
}

export async function deletePriceTarget(ticker: string): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/price-targets", {
    method: "DELETE",
    body: JSON.stringify({ ticker }),
  });
}

export async function fetchIhsgBenchmark(
  period1: string,
  period2?: string
): Promise<BenchmarkPoint[]> {
  const params = new URLSearchParams({ period1 });
  if (period2) {
    params.set("period2", period2);
  }

  const payload = await requestJson<{
    benchmark: { series: BenchmarkPoint[] };
  }>(`/api/benchmark/ihsg?${params.toString()}`);

  return payload.benchmark.series;
}

export async function updateTradingSignalStatus(
  signalId: string,
  status: "DISMISSED" | "EXECUTED"
): Promise<void> {
  await requestJson<{ ok: boolean }>(`/api/signals/${signalId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchMarketPrices(
  tickers: string[]
): Promise<Record<string, number>> {
  const snapshots = await fetchMarketSnapshots(tickers);
  return Object.fromEntries(
    Object.entries(snapshots).map(([ticker, snapshot]) => [ticker, snapshot.price])
  );
}

export async function fetchMarketSnapshots(
  tickers: string[]
): Promise<Record<string, MarketPriceSnapshot>> {
  if (tickers.length === 0) return {};
  try {
    const params = new URLSearchParams({ tickers: tickers.join(",") });
    const response = await fetch(`/api/market-prices?${params.toString()}`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.prices || {};
  } catch (err) {
    console.error("Failed to fetch market prices:", err);
    return {};
  }
}
