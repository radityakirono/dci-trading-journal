import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers");
    
    if (!tickersParam) {
      return NextResponse.json({ prices: {} });
    }

    const tickers = tickersParam.split(",").filter(Boolean);
    const prices: Record<string, number> = {};

    // For Yahoo Finance, Indonesian stocks need .JK suffix
    const queries = tickers.map(async (ticker) => {
      try {
        const symbol = ticker.endsWith(".JK") ? ticker : `${ticker}.JK`;
        const quote = await yahooFinance.quote(symbol);
        const anyQuote = quote as any;
        if (anyQuote && anyQuote.regularMarketPrice) {
          prices[ticker] = anyQuote.regularMarketPrice;
        }
      } catch (err) {
        console.warn("Failed to fetch quote for %s:", ticker, err);
      }
    });

    await Promise.allSettled(queries);

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Market Prices API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market prices" },
      { status: 500 }
    );
  }
}
