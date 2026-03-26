import { initialSignalNotifications } from "@/lib/mock-data";
import type { SignalNotification } from "@/lib/types";
import {
  mapSignalNotificationRows,
  normalizeSignalType as normalizeSignalTypeValue,
} from "@/lib/signals";
import type { SignalType } from "@/lib/types";

export type SignalRow = {
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
  return initialSignalNotifications;
}

export function normalizeSignalType(value?: string | null): SignalType {
  return normalizeSignalTypeValue(value);
}

export function mapSignalRows(rows: SignalRow[]): SignalNotification[] {
  return mapSignalNotificationRows(rows);
}
