"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchMarketSnapshots } from "@/lib/api-client";
import {
  getJakartaMarketStatus,
  type MarketPriceSnapshot,
} from "@/lib/market";

interface UseMarketDataResult {
  snapshots: Record<string, MarketPriceSnapshot>;
  priceMap: Record<string, number>;
  isLoading: boolean;
  isMarketOpen: boolean;
  marketStatusLabel: string;
  lastUpdatedAt: number | null;
  hasDelayedData: boolean;
}

export function useMarketData(tickers: string[]): UseMarketDataResult {
  const [snapshots, setSnapshots] = useState<Record<string, MarketPriceSnapshot>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const normalizedTickers = useMemo(
    () => Array.from(new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))),
    [tickers]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const marketStatus = useMemo(() => getJakartaMarketStatus(clockTick), [clockTick]);

  useEffect(() => {
    if (normalizedTickers.length === 0) {
      setSnapshots({});
      setLastUpdatedAt(null);
      return;
    }

    let mounted = true;
    let intervalId: number | null = null;

    const syncSnapshots = async () => {
      if (document.visibilityState === "hidden") return;
      setIsLoading(true);

      try {
        const nextSnapshots = await fetchMarketSnapshots(normalizedTickers);
        if (!mounted) return;
        if (Object.keys(nextSnapshots).length > 0) {
          setSnapshots(nextSnapshots);
          setLastUpdatedAt(Date.now());
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const startPolling = () => {
      if (intervalId != null) window.clearInterval(intervalId);
      intervalId = window.setInterval(syncSnapshots, marketStatus.refreshIntervalMs);
    };

    void syncSnapshots();
    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncSnapshots();
        startPolling();
      } else if (intervalId != null) {
        window.clearInterval(intervalId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [marketStatus.refreshIntervalMs, normalizedTickers]);

  const priceMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(snapshots).map(([ticker, snapshot]) => [ticker, snapshot.price])
      ),
    [snapshots]
  );

  const hasDelayedData = useMemo(
    () => Object.values(snapshots).some((snapshot) => snapshot.isDelayed),
    [snapshots]
  );

  return {
    snapshots,
    priceMap,
    isLoading,
    isMarketOpen: marketStatus.isOpen,
    marketStatusLabel: marketStatus.label,
    lastUpdatedAt,
    hasDelayedData,
  };
}
