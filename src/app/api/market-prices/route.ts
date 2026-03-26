import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MarketPriceSnapshot } from "@/lib/market";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";
import { yahooFinance } from "@/lib/yahoo-finance";

type CacheRow = {
  ticker: string;
  price: number | null;
  prev_close: number | null;
  change_pct: number | null;
  updated_at: string | null;
};

type QuoteSnapshot = {
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketPreviousClose?: number | null;
  regularMarketTime?: Date | string | number | null;
};

function normalizeCacheChangePct(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function buildCacheSnapshot(row: CacheRow): MarketPriceSnapshot | null {
  if (typeof row.price !== "number") return null;
  const prevClose = typeof row.prev_close === "number" ? row.prev_close : null;
  const normalizedChangePct = normalizeCacheChangePct(row.change_pct);
  const change =
    prevClose != null
      ? row.price - prevClose
      : typeof normalizedChangePct === "number"
        ? row.price * normalizedChangePct
        : 0;

  return {
    price: row.price,
    change,
    changePct:
      typeof normalizedChangePct === "number"
        ? normalizedChangePct
        : prevClose && prevClose > 0
          ? change / prevClose
          : 0,
    prevClose,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    isDelayed: true,
    source: "cache",
  };
}

async function fetchYahooSnapshot(ticker: string): Promise<MarketPriceSnapshot | null> {
  try {
    const symbol = ticker.endsWith(".JK") ? ticker : `${ticker}.JK`;
    const quote = (await yahooFinance.quote(symbol)) as QuoteSnapshot | null;
    if (typeof quote?.regularMarketPrice !== "number") return null;

    const prevClose =
      typeof quote.regularMarketPreviousClose === "number"
        ? quote.regularMarketPreviousClose
        : null;
    const change =
      typeof quote.regularMarketChange === "number"
        ? quote.regularMarketChange
        : prevClose != null
          ? quote.regularMarketPrice - prevClose
          : 0;

    return {
      price: quote.regularMarketPrice,
      change,
      changePct:
        typeof quote.regularMarketChangePercent === "number"
          ? quote.regularMarketChangePercent / 100
          : prevClose && prevClose > 0
            ? change / prevClose
            : 0,
      prevClose,
      updatedAt: new Date(
        quote.regularMarketTime ? quote.regularMarketTime : Date.now()
      ).toISOString(),
      isDelayed: false,
      source: "yahoo",
    };
  } catch (error) {
    console.warn("Failed to fetch Yahoo Finance quote for %s:", ticker, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  try {
    const tickersParam = request.nextUrl.searchParams.get("tickers");
    if (!tickersParam) {
      return NextResponse.json({ prices: {} });
    }

    const tickers = Array.from(
      new Set(
        tickersParam
          .split(",")
          .map((ticker) => ticker.trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const prices: Record<string, MarketPriceSnapshot> = {};
    let cacheRowsByTicker = new Map<string, CacheRow>();

    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("market_data_cache")
        .select("ticker, price, prev_close, change_pct, updated_at")
        .in("ticker", tickers);

      cacheRowsByTicker = new Map(
        ((data ?? []) as CacheRow[]).map((row) => [row.ticker.toUpperCase(), row])
      );
    } catch (error) {
      console.warn("Failed to load market_data_cache fallback:", error);
    }

    const queries = tickers.map(async (ticker) => {
      const yahooSnapshot = await fetchYahooSnapshot(ticker);
      if (yahooSnapshot) {
        prices[ticker] = yahooSnapshot;
        return;
      }

      const cacheRow = cacheRowsByTicker.get(ticker);
      const cacheSnapshot = cacheRow ? buildCacheSnapshot(cacheRow) : null;
      if (cacheSnapshot) {
        prices[ticker] = cacheSnapshot;
      }
    });

    await Promise.allSettled(queries);

    return NextResponse.json(
      { prices },
      {
        headers: {
          "Cache-Control": "s-maxage=55, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Market Prices API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market prices", code: "MARKET_DATA_ERROR" },
      { status: 500 }
    );
  }
}
