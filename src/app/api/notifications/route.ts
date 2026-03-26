import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildPriceTargetNotifications,
  buildPortfolioAlerts,
  buildQuantSignalNotifications,
  PRICE_TARGET_WATCH_ENTITY,
  type MarketCacheRow,
  mapPriceTargetRows,
  mapNotificationRows,
  type NotificationRow,
  upsertNotifications,
} from "@/lib/notifications";
import { type QuantSignalRow, type SignalActionRow } from "@/lib/signals";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";
import { listQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function syncQuantNotifications(userId: string, authClient: SupabaseClient) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: quantSignals, error: signalsError } = await supabaseAdmin
    .from("quant_signals")
    .select("id, created_at, signal_ts, ticker, ticker_short, signal_type, message, source, conviction, regime, trade_ticket")
    .order("signal_ts", { ascending: false })
    .limit(80);

  if (signalsError) {
    throw new Error(`Failed to sync quant signals: ${signalsError.message}`);
  }

  const signalRows = (quantSignals ?? []) as QuantSignalRow[];
  const signalIds = signalRows.map((row) => row.id);

  let signalActions: SignalActionRow[] = [];
  if (signalIds.length > 0) {
    const { data: actionRows, error: actionsError } = await authClient
      .from("signal_actions")
      .select("signal_id, status, action_date, linked_transaction_id")
      .eq("user_id", userId)
      .in("signal_id", signalIds);

    if (actionsError) {
      throw new Error(`Failed to sync signal actions: ${actionsError.message}`);
    }

    signalActions = (actionRows ?? []) as SignalActionRow[];
  }

  const { data: notificationRows, error: notificationsError } = await authClient
    .from("notifications")
    .select(
      "id, type, message, created_at, is_read, read_at, related_entity_type, related_entity_id, metadata"
    )
    .eq("user_id", userId)
    .in("type", ["NEW_SIGNAL", "SIGNAL_EXPIRED", "PORTFOLIO_ALERT"])
    .neq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .order("created_at", { ascending: false })
    .limit(400);

  if (notificationsError) {
    throw new Error(`Failed to inspect notifications: ${notificationsError.message}`);
  }

  const { data: targetRows, error: targetError } = await authClient
    .from("notifications")
    .select(
      "id, type, message, created_at, is_read, read_at, related_entity_type, related_entity_id, metadata"
    )
    .eq("user_id", userId)
    .eq("type", "PORTFOLIO_ALERT")
    .eq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .order("created_at", { ascending: false });

  if (targetError) {
    throw new Error(`Failed to inspect price targets: ${targetError.message}`);
  }

  const trackedTickers = Array.from(
    new Set([
      ...signalRows.flatMap((row) => {
        const tickers = [row.ticker_short, row.ticker]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim().toUpperCase());

        return tickers.flatMap((ticker) =>
          ticker.endsWith(".JK") ? [ticker, ticker.replace(/\.JK$/, "")] : [ticker]
        );
      }),
      ...mapPriceTargetRows((targetRows ?? []) as NotificationRow[]).flatMap((target) =>
        target.ticker.endsWith(".JK")
          ? [target.ticker, target.ticker.replace(/\.JK$/, "")]
          : [target.ticker]
      ),
    ])
  );

  let marketRows: MarketCacheRow[] = [];
  if (trackedTickers.length > 0) {
    const { data: rawMarketRows, error: marketError } = await supabaseAdmin
      .from("market_data_cache")
      .select("ticker, price, prev_close, change_pct, updated_at")
      .in("ticker", trackedTickers);

    if (marketError) {
      throw new Error(`Failed to inspect market cache: ${marketError.message}`);
    }

    marketRows = (rawMarketRows ?? []) as MarketCacheRow[];
  }

  const existingNotifications = (notificationRows ?? []) as NotificationRow[];
  const pendingNotifications = [
    ...buildQuantSignalNotifications(
      signalRows,
      userId,
      signalActions,
      existingNotifications
    ),
    ...buildPortfolioAlerts(
      signalRows,
      userId,
      signalActions,
      existingNotifications,
      marketRows
    ),
    ...buildPriceTargetNotifications(
      (targetRows ?? []) as NotificationRow[],
      userId,
      existingNotifications,
      marketRows
    ),
  ];

  if (pendingNotifications.length > 0) {
    await upsertNotifications(supabaseAdmin, pendingNotifications);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  const parsedQuery = listQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit"),
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", code: "INVALID_QUERY" },
      { status: 400 }
    );
  }

  try {
    await syncQuantNotifications(auth.user.id, auth.client);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification sync failed";
    console.error(message);
  }

  const { data, error } = await auth.client
    .from("notifications")
    .select(
      "id, type, message, created_at, is_read, read_at, related_entity_type, related_entity_id, metadata"
    )
    .eq("user_id", auth.user.id)
    .neq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .order("created_at", { ascending: false })
    .limit(Math.min(parsedQuery.data.limit, 100));

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "NOTIFICATION_QUERY_FAILED" },
      { status: 500 }
    );
  }

  const notifications = mapNotificationRows((data ?? []) as NotificationRow[]);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const markAll = Boolean((body as { markAll?: unknown }).markAll);
  const ids = Array.isArray((body as { ids?: unknown }).ids)
    ? ((body as { ids: string[] }).ids.filter((value) => typeof value === "string"))
    : [];
  const singleId =
    typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : null;
  const targetIds = singleId ? [singleId, ...ids] : ids;

  if (!markAll && targetIds.length === 0) {
    return NextResponse.json(
      { error: "No notification target provided.", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  let query = auth.client
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id);

  if (!markAll) {
    query = query.in("id", Array.from(new Set(targetIds)));
  } else {
    query = query.eq("is_read", false);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json(
      { error: error.message, code: "NOTIFICATION_UPDATE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
