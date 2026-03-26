import { formatPercent } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export const SMALL_SAMPLE_WIN_RATE_NOTE =
  "* Based on fewer than 3 closed trades. Statistically insignificant.";

export interface WinRateStats {
  winRate: number | null;
  closedTrades: number;
  hasSmallSample: boolean;
}

export function calculateWinRateStats(transactions: Transaction[]): WinRateStats {
  const sells = transactions.filter((transaction) => transaction.side === "SELL");

  if (sells.length === 0) {
    return {
      winRate: null,
      closedTrades: 0,
      hasSmallSample: false,
    };
  }

  let wins = 0;
  for (const sell of sells) {
    const buys = transactions.filter(
      (transaction) =>
        transaction.side === "BUY" &&
        transaction.ticker === sell.ticker &&
        transaction.date <= sell.date
    );
    const averageBuy =
      buys.length > 0
        ? buys.reduce((sum, buy) => sum + buy.price, 0) / buys.length
        : sell.price;

    if (sell.price > averageBuy) wins += 1;
  }

  return {
    winRate: wins / sells.length,
    closedTrades: sells.length,
    hasSmallSample: sells.length < 3,
  };
}

export function formatWinRateWithSample(stats: WinRateStats) {
  if (stats.closedTrades === 0 || stats.winRate == null) {
    return "N/A";
  }

  return `${formatPercent(stats.winRate)}${stats.hasSmallSample ? "*" : ""} (n=${stats.closedTrades})`;
}

