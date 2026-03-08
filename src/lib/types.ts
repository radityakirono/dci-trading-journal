export type TradeSide = "BUY" | "SELL";

export type CashFlowType = "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";

export type SignalType = "BUY" | "SELL" | "HOLD" | "ALERT";

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  note?: string;
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
