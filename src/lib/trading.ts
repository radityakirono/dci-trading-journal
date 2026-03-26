import type { TradeSide, TradeStrategy } from "@/lib/types";

export const SHARES_PER_LOT = 100;

export const TRADE_STRATEGIES = [
  "Signal-Based",
  "Breakout",
  "Swing Trade",
  "Value Investing",
  "Momentum",
  "Manual",
] as const satisfies readonly TradeStrategy[];

export function calculateGrossTradeValue(
  quantityLots: number,
  price: number
): number {
  return quantityLots * SHARES_PER_LOT * price;
}

export function calculateBrokerFee(
  side: TradeSide,
  quantityLots: number,
  price: number
): number {
  const gross = calculateGrossTradeValue(quantityLots, price);
  const feeRate = side === "BUY" ? 0.0015 : 0.0025;
  return Math.round(gross * feeRate);
}

export function calculateNetTradeValue(
  side: TradeSide,
  quantityLots: number,
  price: number
): number {
  const gross = calculateGrossTradeValue(quantityLots, price);
  const fee = calculateBrokerFee(side, quantityLots, price);
  return side === "BUY" ? gross + fee : gross - fee;
}

export function getSignedCashImpact(
  side: TradeSide,
  quantityLots: number,
  price: number
): number {
  const netValue = calculateNetTradeValue(side, quantityLots, price);
  return side === "BUY" ? -netValue : netValue;
}
