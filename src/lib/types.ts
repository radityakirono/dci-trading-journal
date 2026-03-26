export type TradeSide = "BUY" | "SELL";

export type TradeStrategy =
  | "Signal-Based"
  | "Breakout"
  | "Swing Trade"
  | "Value Investing"
  | "Momentum"
  | "Manual";

export type CashFlowType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "DIVIDEND"
  | "ADJUSTMENT";

export type LedgerFlowType =
  | CashFlowType
  | "BUY_ORDER"
  | "SELL_ORDER"
  | "BROKER_FEE";

export type SignalType = "BUY" | "SELL" | "HOLD" | "ALERT";
export type SignalLifecycleStatus =
  | "ACTIVE"
  | "EXECUTED"
  | "DISMISSED"
  | "EXPIRED";
export type PriceTargetDirection = "above" | "below";
export type NotificationType =
  | "NEW_SIGNAL"
  | "SIGNAL_EXECUTED"
  | "SIGNAL_EXPIRED"
  | "ORDER_PLACED"
  | "PORTFOLIO_ALERT"
  | "PRICE_TARGET";

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  side: TradeSide;
  strategy: TradeStrategy;
  quantity: number;
  price: number;
  fee: number;
  note?: string;
}

export interface TransactionInput {
  date: string;
  ticker: string;
  side: TradeSide;
  strategy: TradeStrategy;
  quantity: number;
  price: number;
  note?: string;
  signalId?: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
  dailyPnl: number;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  type: CashFlowType;
  amount: number;
  note?: string;
}

export interface CashFlowEntryInput {
  date: string;
  type: CashFlowType;
  amount: number;
  note?: string;
}

export interface SignalNotification {
  id: string;
  createdAt: string;
  ticker: string;
  type: SignalType;
  message: string;
  source?: string;
  confidence?: number | null;
  isRead?: boolean;
}

export interface TradingSignal extends SignalNotification {
  status: SignalLifecycleStatus;
  signalTs: string;
  actionDate?: string | null;
  currentPrice?: number | null;
  linkedTransactionId?: string | null;
  regime?: string | null;
  tradeTicket?: {
    targetEntry?: number | null;
    sizeLots?: number | null;
    riskAmount?: number | null;
  } | null;
}

export interface SignalExecutionPrefill {
  signalId: string;
  ticker: string;
  side: Extract<SignalType, "BUY" | "SELL">;
  price: number;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PriceTargetWatch {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: PriceTargetDirection;
  currentPriceAtSet?: number | null;
  createdAt: string;
}
