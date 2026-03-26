import { calculateGrossTradeValue, SHARES_PER_LOT } from "@/lib/trading";
import type { Transaction } from "@/lib/types";

export type SignalExecutionOutcomeKind =
  | "realized"
  | "mark_to_market"
  | "mixed"
  | "pending";

export interface SignalExecutionOutcome {
  amount: number | null;
  kind: SignalExecutionOutcomeKind;
  remainingLots: number;
}

type OutcomeAccumulator = {
  side: Transaction["side"];
  realizedPnl: number;
  markToMarketPnl: number | null;
  remainingLots: number;
};

type OpenBuyLot = {
  transactionId: string;
  ticker: string;
  remainingLots: number;
  costBasisPerLot: number;
};

function sortTransactionsChronologically(transactions: Transaction[]) {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((left, right) => {
      const dateCompare = left.transaction.date.localeCompare(right.transaction.date);
      if (dateCompare !== 0) return dateCompare;
      return left.index - right.index;
    })
    .map(({ transaction }) => transaction);
}

export function buildSignalExecutionOutcomeMap(
  transactions: Transaction[],
  marketPrices: Record<string, number>
) {
  const outcomes = new Map<string, OutcomeAccumulator>();
  const openBuyLots = new Map<string, OpenBuyLot[]>();

  for (const transaction of sortTransactionsChronologically(transactions)) {
    if (transaction.side === "BUY") {
      const totalCost =
        calculateGrossTradeValue(transaction.quantity, transaction.price) + transaction.fee;
      const costBasisPerLot = totalCost / transaction.quantity;

      outcomes.set(transaction.id, {
        side: "BUY",
        realizedPnl: 0,
        markToMarketPnl: null,
        remainingLots: transaction.quantity,
      });

      const queue = openBuyLots.get(transaction.ticker) ?? [];
      queue.push({
        transactionId: transaction.id,
        ticker: transaction.ticker,
        remainingLots: transaction.quantity,
        costBasisPerLot,
      });
      openBuyLots.set(transaction.ticker, queue);
      continue;
    }

    const totalNetProceeds =
      calculateGrossTradeValue(transaction.quantity, transaction.price) - transaction.fee;
    const proceedsPerLot = totalNetProceeds / transaction.quantity;
    const queue = openBuyLots.get(transaction.ticker) ?? [];
    let remainingToSell = transaction.quantity;
    let realizedPnl = 0;

    while (remainingToSell > 0 && queue.length > 0) {
      const currentLot = queue[0];
      const matchedLots = Math.min(remainingToSell, currentLot.remainingLots);
      const matchedCostBasis = currentLot.costBasisPerLot * matchedLots;
      const matchedProceeds = proceedsPerLot * matchedLots;
      const matchedPnl = matchedProceeds - matchedCostBasis;

      realizedPnl += matchedPnl;

      const buyOutcome = outcomes.get(currentLot.transactionId);
      if (buyOutcome) {
        buyOutcome.realizedPnl += matchedPnl;
        buyOutcome.remainingLots = Math.max(0, buyOutcome.remainingLots - matchedLots);
      }

      currentLot.remainingLots -= matchedLots;
      remainingToSell -= matchedLots;

      if (currentLot.remainingLots <= 0) {
        queue.shift();
      }
    }

    outcomes.set(transaction.id, {
      side: "SELL",
      realizedPnl,
      markToMarketPnl: 0,
      remainingLots: 0,
    });

    if (queue.length > 0) {
      openBuyLots.set(transaction.ticker, queue);
    } else {
      openBuyLots.delete(transaction.ticker);
    }
  }

  for (const [ticker, queue] of openBuyLots.entries()) {
    const marketPrice = marketPrices[ticker];
    if (typeof marketPrice !== "number" || Number.isNaN(marketPrice) || marketPrice <= 0) {
      continue;
    }

    for (const lot of queue) {
      const outcome = outcomes.get(lot.transactionId);
      if (!outcome) continue;

      const currentValue = lot.remainingLots * SHARES_PER_LOT * marketPrice;
      const remainingCostBasis = lot.remainingLots * lot.costBasisPerLot;
      const markToMarketPnl = currentValue - remainingCostBasis;

      outcome.markToMarketPnl = (outcome.markToMarketPnl ?? 0) + markToMarketPnl;
    }
  }

  const result: Record<string, SignalExecutionOutcome> = {};

  for (const [transactionId, outcome] of outcomes.entries()) {
    if (outcome.side === "SELL") {
      result[transactionId] = {
        amount: Math.round(outcome.realizedPnl),
        kind: "realized",
        remainingLots: 0,
      };
      continue;
    }

    if (outcome.remainingLots <= 0) {
      result[transactionId] = {
        amount: Math.round(outcome.realizedPnl),
        kind: "realized",
        remainingLots: 0,
      };
      continue;
    }

    if (outcome.markToMarketPnl != null) {
      result[transactionId] = {
        amount: Math.round(outcome.realizedPnl + outcome.markToMarketPnl),
        kind: outcome.realizedPnl !== 0 ? "mixed" : "mark_to_market",
        remainingLots: outcome.remainingLots,
      };
      continue;
    }

    result[transactionId] = {
      amount: outcome.realizedPnl !== 0 ? Math.round(outcome.realizedPnl) : null,
      kind: outcome.realizedPnl !== 0 ? "mixed" : "pending",
      remainingLots: outcome.remainingLots,
    };
  }

  return result;
}

