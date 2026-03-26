import type { SupabaseClient } from "@supabase/supabase-js";

import { isSignalExpired, type QuantSignalRow, type SignalActionRow } from "@/lib/signals";
import type {
  AppNotification,
  NotificationType,
  PriceTargetDirection,
  PriceTargetWatch,
} from "@/lib/types";

export const PRICE_TARGET_WATCH_ENTITY = "PRICE_TARGET_WATCH";
export const PRICE_TARGET_HIT_ENTITY = "PRICE_TARGET_HIT";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  message: string;
  created_at: string;
  is_read: boolean | null;
  read_at: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type MarketCacheRow = {
  ticker: string;
  price: number | null;
  prev_close?: number | null;
  change_pct?: number | null;
  updated_at?: string | null;
};

export interface NotificationUpsertInput {
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePriceTargetMetadata(row: NotificationRow) {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const targetPrice =
    typeof metadata.targetPrice === "number"
      ? metadata.targetPrice
      : typeof metadata.target_price === "number"
        ? metadata.target_price
        : null;
  const direction =
    metadata.direction === "above" || metadata.direction === "below"
      ? (metadata.direction as PriceTargetDirection)
      : null;
  const currentPriceAtSet =
    typeof metadata.currentPriceAtSet === "number"
      ? metadata.currentPriceAtSet
      : typeof metadata.current_price_at_set === "number"
        ? metadata.current_price_at_set
        : null;

  return {
    ticker:
      typeof metadata.ticker === "string" && metadata.ticker.trim().length > 0
        ? metadata.ticker.trim().toUpperCase()
        : row.related_entity_id?.trim().toUpperCase() ?? "",
    targetPrice,
    direction,
    currentPriceAtSet,
  };
}

export function mapNotificationRows(rows: NotificationRow[]): AppNotification[] {
  return rows.map((row) => ({
    id: row.id,
    type:
      row.type === "PORTFOLIO_ALERT" && row.related_entity_type === PRICE_TARGET_HIT_ENTITY
        ? "PRICE_TARGET"
        : row.type,
    message: row.message,
    createdAt: row.created_at,
    isRead: Boolean(row.is_read ?? row.read_at),
    readAt: row.read_at,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    metadata: row.metadata ?? {},
  }));
}

export function mapPriceTargetRows(rows: NotificationRow[]): PriceTargetWatch[] {
  return rows
    .filter((row) => row.related_entity_type === PRICE_TARGET_WATCH_ENTITY)
    .reduce<PriceTargetWatch[]>((targets, row) => {
      const metadata = parsePriceTargetMetadata(row);
      if (!metadata.ticker || typeof metadata.targetPrice !== "number") {
        return targets;
      }

      targets.push({
        id: row.id,
        ticker: metadata.ticker,
        targetPrice: metadata.targetPrice,
        direction:
          metadata.direction ??
          (metadata.currentPriceAtSet != null && metadata.currentPriceAtSet > metadata.targetPrice
            ? "below"
            : "above"),
        currentPriceAtSet: metadata.currentPriceAtSet,
        createdAt: row.created_at,
      } satisfies PriceTargetWatch);

      return targets;
    }, []);
}

export async function upsertNotifications(
  client: SupabaseClient,
  notifications: NotificationUpsertInput[]
) {
  if (notifications.length === 0) return;

  const payload = notifications.map((notification) => ({
    user_id: notification.userId,
    type: notification.type,
    message: notification.message,
    related_entity_type: notification.relatedEntityType,
    related_entity_id: notification.relatedEntityId,
    created_at: notification.createdAt ?? new Date().toISOString(),
    metadata: notification.metadata ?? {},
  }));

  const { error } = await client.from("notifications").upsert(payload, {
    onConflict: "user_id,type,related_entity_type,related_entity_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to upsert notifications: ${error.message}`);
  }
}

function buildNewSignalMessage(signal: QuantSignalRow) {
  const ticker = signal.ticker_short ?? signal.ticker;
  const type = signal.signal_type?.toUpperCase() ?? "ALERT";
  const confidence =
    signal.conviction != null ? ` — Confidence: ${Math.round(signal.conviction * 100)}%` : "";
  return `New ${type} signal for ${ticker}${confidence}`;
}

function buildExpiredSignalMessage(signal: QuantSignalRow) {
  const ticker = signal.ticker_short ?? signal.ticker;
  return `Signal for ${ticker} has expired without action`;
}

function formatRupiah(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function getSignalTickerCandidates(signal: QuantSignalRow) {
  const candidates = new Set<string>();

  if (signal.ticker_short) {
    candidates.add(signal.ticker_short.toUpperCase());
  }

  if (signal.ticker) {
    const normalizedTicker = signal.ticker.toUpperCase();
    candidates.add(normalizedTicker);
    candidates.add(normalizedTicker.replace(/\.JK$/, ""));
  }

  return Array.from(candidates);
}

function buildPortfolioAlertMessage(
  signal: QuantSignalRow,
  marketPrice: number,
  targetEntry: number
) {
  const ticker = signal.ticker_short ?? signal.ticker;
  const normalizedType = signal.signal_type?.toUpperCase() ?? "ALERT";

  if (normalizedType === "SELL") {
    return `${ticker} has reached the SELL trigger at ${formatRupiah(marketPrice)} versus target ${formatRupiah(targetEntry)}`;
  }

  return `${ticker} has reached the BUY entry zone at ${formatRupiah(marketPrice)} versus target ${formatRupiah(targetEntry)}`;
}

function buildPriceTargetMessage(
  target: PriceTargetWatch,
  marketPrice: number
) {
  return `${target.ticker} reached your target price of ${formatRupiah(target.targetPrice)}. Current price: ${formatRupiah(marketPrice)}`;
}

export function buildQuantSignalNotifications(
  signalRows: QuantSignalRow[],
  userId: string,
  signalActions: SignalActionRow[],
  existingNotifications: NotificationRow[],
  nowMs = Date.now()
) {
  const existingKeys = new Set(
    existingNotifications.map(
      (notification) =>
        `${notification.type}:${notification.related_entity_type}:${notification.related_entity_id}`
    )
  );
  const actedSignalIds = new Set(signalActions.map((action) => action.signal_id));
  const pendingNotifications: NotificationUpsertInput[] = [];

  for (const signal of signalRows) {
    const signalKey = signal.id;
    const newSignalKey = `NEW_SIGNAL:SIGNAL:${signalKey}`;
    if (!existingKeys.has(newSignalKey)) {
      pendingNotifications.push({
        userId,
        type: "NEW_SIGNAL",
        message: buildNewSignalMessage(signal),
        relatedEntityType: "SIGNAL",
        relatedEntityId: signalKey,
        createdAt: signal.signal_ts,
        metadata: {
          signalId: signal.id,
          ticker: signal.ticker_short ?? signal.ticker,
          signalType: signal.signal_type ?? "ALERT",
          conviction: signal.conviction ?? null,
          regime: signal.regime ?? null,
          source: signal.source ?? null,
        },
      });
    }

    const expiredSignalKey = `SIGNAL_EXPIRED:SIGNAL:${signalKey}`;
    if (
      isSignalExpired(signal.signal_ts, nowMs) &&
      !actedSignalIds.has(signalKey) &&
      !existingKeys.has(expiredSignalKey)
    ) {
      pendingNotifications.push({
        userId,
        type: "SIGNAL_EXPIRED",
        message: buildExpiredSignalMessage(signal),
        relatedEntityType: "SIGNAL",
        relatedEntityId: signalKey,
        metadata: {
          signalId: signal.id,
          ticker: signal.ticker_short ?? signal.ticker,
          signalType: signal.signal_type ?? "ALERT",
          expiredAt: new Date(nowMs).toISOString(),
        },
      });
    }
  }

  return pendingNotifications;
}

export function buildPortfolioAlerts(
  signalRows: QuantSignalRow[],
  userId: string,
  signalActions: SignalActionRow[],
  existingNotifications: NotificationRow[],
  marketRows: MarketCacheRow[],
  nowMs = Date.now()
) {
  const existingKeys = new Set(
    existingNotifications.map(
      (notification) =>
        `${notification.type}:${notification.related_entity_type}:${notification.related_entity_id}`
    )
  );
  const actedSignalIds = new Set(signalActions.map((action) => action.signal_id));
  const marketRowsByTicker = new Map(
    marketRows.map((row) => [row.ticker.trim().toUpperCase(), row])
  );
  const pendingNotifications: NotificationUpsertInput[] = [];

  for (const signal of signalRows) {
    if (actedSignalIds.has(signal.id) || isSignalExpired(signal.signal_ts, nowMs)) {
      continue;
    }

    const targetEntry = signal.trade_ticket?.target_entry;
    if (typeof targetEntry !== "number" || targetEntry <= 0) {
      continue;
    }

    const normalizedType = signal.signal_type?.toUpperCase() ?? "ALERT";
    if (normalizedType !== "BUY" && normalizedType !== "SELL") {
      continue;
    }

    const marketRow = getSignalTickerCandidates(signal)
      .map((ticker) => marketRowsByTicker.get(ticker))
      .find((row) => typeof row?.price === "number");

    if (!marketRow || typeof marketRow.price !== "number") {
      continue;
    }

    const hasReachedTarget =
      normalizedType === "BUY"
        ? marketRow.price <= targetEntry
        : marketRow.price >= targetEntry;

    if (!hasReachedTarget) {
      continue;
    }

    const notificationKey = `PORTFOLIO_ALERT:SIGNAL_TARGET:${signal.id}`;
    if (existingKeys.has(notificationKey)) {
      continue;
    }

    pendingNotifications.push({
      userId,
      type: "PORTFOLIO_ALERT",
      message: buildPortfolioAlertMessage(signal, marketRow.price, targetEntry),
      relatedEntityType: "SIGNAL_TARGET",
      relatedEntityId: signal.id,
      createdAt: marketRow.updated_at ?? new Date(nowMs).toISOString(),
      metadata: {
        signalId: signal.id,
        ticker: signal.ticker_short ?? signal.ticker,
        signalType: normalizedType,
        currentPrice: marketRow.price,
        targetEntry,
        marketUpdatedAt: marketRow.updated_at ?? null,
      },
    });
  }

  return pendingNotifications;
}

export function buildPriceTargetNotifications(
  targetRows: NotificationRow[],
  userId: string,
  existingNotifications: NotificationRow[],
  marketRows: MarketCacheRow[]
) {
  const existingKeys = new Set(
    existingNotifications.map(
      (notification) =>
        `${notification.type}:${notification.related_entity_type}:${notification.related_entity_id}`
    )
  );
  const marketRowsByTicker = new Map(
    marketRows.map((row) => [row.ticker.trim().toUpperCase(), row])
  );
  const pendingNotifications: NotificationUpsertInput[] = [];

  for (const target of mapPriceTargetRows(targetRows)) {
    const marketRow = marketRowsByTicker.get(target.ticker);
    if (!marketRow || typeof marketRow.price !== "number") {
      continue;
    }

    const hasReachedTarget =
      target.direction === "above"
        ? marketRow.price >= target.targetPrice
        : marketRow.price <= target.targetPrice;

    if (!hasReachedTarget) {
      continue;
    }

    const notificationKey = `PORTFOLIO_ALERT:${PRICE_TARGET_HIT_ENTITY}:${target.id}`;
    if (existingKeys.has(notificationKey)) {
      continue;
    }

    pendingNotifications.push({
      userId,
      type: "PORTFOLIO_ALERT",
      message: buildPriceTargetMessage(target, marketRow.price),
      relatedEntityType: PRICE_TARGET_HIT_ENTITY,
      relatedEntityId: target.id,
      createdAt: marketRow.updated_at ?? new Date().toISOString(),
      metadata: {
        ticker: target.ticker,
        targetPrice: target.targetPrice,
        direction: target.direction,
        currentPrice: marketRow.price,
        currentPriceAtSet: target.currentPriceAtSet ?? null,
        marketUpdatedAt: marketRow.updated_at ?? null,
      },
    });
  }

  return pendingNotifications;
}
