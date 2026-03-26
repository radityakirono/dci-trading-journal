import type {
  CashFlowEntry,
  CashFlowType,
  LedgerFlowType,
  TradeSide,
  Transaction,
} from "@/lib/types";
import {
  calculateGrossTradeValue,
  SHARES_PER_LOT,
} from "@/lib/trading";

export interface CashLedgerEntry {
  id: string;
  date: string;
  type: LedgerFlowType;
  description: string;
  amount: number;
  runningBalance: number;
  note?: string;
  source: "manual" | "trade";
}

function getManualEntryAmount(entry: CashFlowEntry): number {
  if (entry.type === "WITHDRAWAL") return -Math.abs(entry.amount);
  if (entry.type === "DEPOSIT" || entry.type === "DIVIDEND") return Math.abs(entry.amount);
  return entry.amount;
}

function getManualDescription(type: CashFlowType): string {
  switch (type) {
    case "DEPOSIT":
      return "Capital deposit";
    case "WITHDRAWAL":
      return "Capital withdrawal";
    case "DIVIDEND":
      return "Dividend received";
    default:
      return "Cash adjustment";
  }
}

function getTradeDescription(side: TradeSide, ticker: string, quantity: number, price: number) {
  return `${side} ${quantity} lots ${ticker} @ ${price.toLocaleString("id-ID")}`;
}

export function getHeldLotsByTicker(transactions: Transaction[], ticker: string): number {
  return transactions.reduce((total, transaction) => {
    if (transaction.ticker !== ticker) return total;
    return total + (transaction.side === "BUY" ? transaction.quantity : -transaction.quantity);
  }, 0);
}

export function buildCashLedger(
  manualEntries: CashFlowEntry[],
  transactions: Transaction[]
): CashLedgerEntry[] {
  const staged = [
    ...manualEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: entry.type as LedgerFlowType,
      description: entry.note?.trim() || getManualDescription(entry.type),
      amount: getManualEntryAmount(entry),
      note: entry.note,
      source: "manual" as const,
      sortOrder: 0,
    })),
    ...transactions.flatMap((transaction) => {
      const grossValue = calculateGrossTradeValue(transaction.quantity, transaction.price);
      const orderType: LedgerFlowType =
        transaction.side === "BUY" ? "BUY_ORDER" : "SELL_ORDER";
      return [
        {
          id: `${transaction.id}-order`,
          date: transaction.date,
          type: orderType,
          description: getTradeDescription(
            transaction.side,
            transaction.ticker,
            transaction.quantity,
            transaction.price
          ),
          amount: transaction.side === "BUY" ? -grossValue : grossValue,
          note: undefined,
          source: "trade" as const,
          sortOrder: 1,
        },
        {
          id: `${transaction.id}-fee`,
          date: transaction.date,
          type: "BROKER_FEE" as const,
          description: `Broker fee for ${transaction.side} ${transaction.ticker}`,
          amount: -transaction.fee,
          note: undefined,
          source: "trade" as const,
          sortOrder: 2,
        },
      ];
    }),
  ].sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);
    if (dateCompare !== 0) return dateCompare;
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.id.localeCompare(right.id);
  });

  let runningBalance = 0;

  return staged.map((entry) => {
    runningBalance += entry.amount;
    return {
      id: entry.id,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      amount: entry.amount,
      note: entry.note,
      runningBalance,
      source: entry.source,
    };
  });
}

export function getAvailableCash(
  manualEntries: CashFlowEntry[],
  transactions: Transaction[]
): number {
  const ledger = buildCashLedger(manualEntries, transactions);
  return ledger[ledger.length - 1]?.runningBalance ?? 0;
}

export function buildPositionLotsMap(transactions: Transaction[]): Map<string, number> {
  const positions = new Map<string, number>();
  for (const transaction of transactions) {
    const current = positions.get(transaction.ticker) ?? 0;
    positions.set(
      transaction.ticker,
      Math.max(
        0,
        current + (transaction.side === "BUY" ? transaction.quantity : -transaction.quantity)
      )
    );
  }
  return positions;
}

export function getOpenPositionCount(transactions: Transaction[]): number {
  return Array.from(buildPositionLotsMap(transactions).values()).filter((lots) => lots > 0).length;
}

export function getTotalShares(quantityLots: number): number {
  return quantityLots * SHARES_PER_LOT;
}
