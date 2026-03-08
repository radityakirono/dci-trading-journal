import { initialSignalNotifications } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase/client";
import type { SignalNotification, SignalType } from "@/lib/types";

const SIGNAL_TYPES: SignalType[] = ["BUY", "SELL", "HOLD", "ALERT"];

type SignalRow = {
  id: string;
  created_at: string;
  ticker: string;
  signal_type?: string | null;
  message: string;
  source?: string | null;
  confidence?: number | null;
  read_at?: string | null;
};

export function getDefaultSignalNotifications(): SignalNotification[] {
  return supabase ? [] : initialSignalNotifications;
}

export function normalizeSignalType(value?: string | null): SignalType {
  const normalized = value?.toUpperCase();
  if (normalized && SIGNAL_TYPES.includes(normalized as SignalType)) {
    return normalized as SignalType;
  }
  return "ALERT";
}

export async function fetchSignalNotifications(
  limit = 120
): Promise<SignalNotification[]> {
  if (!supabase) {
    return initialSignalNotifications;
  }

  const { data, error } = await supabase
    .from("signal_notifications")
    .select(
      "id, created_at, ticker, signal_type, message, source, confidence, read_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SignalRow[]).map((row) => ({
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
