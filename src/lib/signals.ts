import type {
  SignalLifecycleStatus,
  SignalNotification,
  SignalType,
  TradingSignal,
} from "@/lib/types";

const SIGNAL_TYPES: SignalType[] = ["BUY", "SELL", "HOLD", "ALERT"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type QuantSignalRow = {
  id: string;
  created_at: string;
  signal_ts: string;
  ticker: string;
  ticker_short?: string | null;
  signal_type?: string | null;
  message: string;
  source?: string | null;
  conviction?: number | null;
  regime?: string | null;
  trade_ticket?: {
    target_entry?: number | null;
    size_lots?: number | null;
    risk_amount?: number | null;
  } | null;
};

export type SignalActionRow = {
  signal_id: string;
  status: Exclude<SignalLifecycleStatus, "ACTIVE" | "EXPIRED">;
  action_date: string | null;
  linked_transaction_id: string | null;
};

export function normalizeSignalType(value?: string | null): SignalType {
  const normalized = value?.toUpperCase();
  if (normalized && SIGNAL_TYPES.includes(normalized as SignalType)) {
    return normalized as SignalType;
  }
  return "ALERT";
}

export function isSignalExpired(signalTs: string, now = Date.now()) {
  return now - new Date(signalTs).getTime() >= THIRTY_DAYS_MS;
}

export function mapSignalNotificationRows(
  rows: Array<{
    id: string;
    created_at: string;
    ticker: string;
    signal_type?: string | null;
    message: string;
    source?: string | null;
    confidence?: number | null;
    read_at?: string | null;
  }>
): SignalNotification[] {
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    ticker: row.ticker,
    type: normalizeSignalType(row.signal_type),
    message: row.message,
    source: row.source ?? undefined,
    confidence: row.confidence ?? null,
    isRead: Boolean(row.read_at),
  }));
}

export function mergeSignalsWithActions(
  rows: QuantSignalRow[],
  actions: SignalActionRow[]
): TradingSignal[] {
  const actionMap = new Map(actions.map((action) => [action.signal_id, action]));

  return rows.map((row) => {
    const action = actionMap.get(row.id);
    let status: SignalLifecycleStatus = "ACTIVE";

    if (action?.status) {
      status = action.status;
    } else if (isSignalExpired(row.signal_ts)) {
      status = "EXPIRED";
    }

    return {
      id: row.id,
      createdAt: row.created_at,
      signalTs: row.signal_ts,
      ticker: row.ticker_short ?? row.ticker,
      type: normalizeSignalType(row.signal_type),
      message: row.message,
      source: row.source ?? undefined,
      confidence: row.conviction ?? null,
      status,
      actionDate: action?.action_date ?? null,
      linkedTransactionId: action?.linked_transaction_id ?? null,
      regime: row.regime ?? null,
      tradeTicket: row.trade_ticket
        ? {
            targetEntry: row.trade_ticket.target_entry ?? null,
            sizeLots: row.trade_ticket.size_lots ?? null,
            riskAmount: row.trade_ticket.risk_amount ?? null,
          }
        : null,
    };
  });
}
