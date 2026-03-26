import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api-response";
import {
  mapPriceTargetRows,
  PRICE_TARGET_WATCH_ENTITY,
  type NotificationRow,
} from "@/lib/notifications";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";
import { priceTargetInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.client
    .from("notifications")
    .select(
      "id, type, message, created_at, is_read, read_at, related_entity_type, related_entity_id, metadata"
    )
    .eq("user_id", auth.user.id)
    .eq("type", "PORTFOLIO_ALERT")
    .eq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError({
      error: `Failed to load price targets: ${error.message}`,
      code: "PRICE_TARGET_QUERY_FAILED",
      status: 500,
    });
  }

  return NextResponse.json({
    targets: mapPriceTargetRows((data ?? []) as NotificationRow[]),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({
      error: "Invalid JSON payload.",
      code: "INVALID_JSON",
      status: 400,
    });
  }

  const parsedBody = priceTargetInputSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError({
      error: parsedBody.error.issues[0]?.message ?? "Invalid price target payload.",
      code: "INVALID_PAYLOAD",
      status: 400,
    });
  }

  const { ticker, targetPrice, currentPrice } = parsedBody.data;
  const direction = currentPrice != null && currentPrice > targetPrice ? "below" : "above";

  const { error: deleteError } = await auth.client
    .from("notifications")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("type", "PORTFOLIO_ALERT")
    .eq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .eq("related_entity_id", ticker);

  if (deleteError) {
    return apiError({
      error: `Failed to replace existing price target: ${deleteError.message}`,
      code: "PRICE_TARGET_REPLACE_FAILED",
      status: 500,
    });
  }

  const createdAt = new Date().toISOString();
  const { data, error } = await auth.client
    .from("notifications")
    .insert({
      id: crypto.randomUUID(),
      user_id: auth.user.id,
      type: "PORTFOLIO_ALERT",
      message: `Price target watch for ${ticker} at Rp ${Math.round(targetPrice).toLocaleString("id-ID")}`,
      is_read: true,
      read_at: createdAt,
      related_entity_type: PRICE_TARGET_WATCH_ENTITY,
      related_entity_id: ticker,
      created_at: createdAt,
      metadata: {
        ticker,
        targetPrice,
        direction,
        currentPriceAtSet: currentPrice ?? null,
      },
    })
    .select(
      "id, type, message, created_at, is_read, read_at, related_entity_type, related_entity_id, metadata"
    )
    .single();

  if (error || !data) {
    return apiError({
      error: `Failed to save price target: ${error?.message ?? "Unknown error"}`,
      code: "PRICE_TARGET_CREATE_FAILED",
      status: 500,
    });
  }

  return NextResponse.json(
    {
      target: mapPriceTargetRows([data as NotificationRow])[0] ?? null,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({
      error: "Invalid JSON payload.",
      code: "INVALID_JSON",
      status: 400,
    });
  }

  const parsedBody = priceTargetInputSchema.pick({ ticker: true }).safeParse(body);
  if (!parsedBody.success) {
    return apiError({
      error: parsedBody.error.issues[0]?.message ?? "Invalid price target payload.",
      code: "INVALID_PAYLOAD",
      status: 400,
    });
  }

  const { error } = await auth.client
    .from("notifications")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("type", "PORTFOLIO_ALERT")
    .eq("related_entity_type", PRICE_TARGET_WATCH_ENTITY)
    .eq("related_entity_id", parsedBody.data.ticker);

  if (error) {
    return apiError({
      error: `Failed to delete price target: ${error.message}`,
      code: "PRICE_TARGET_DELETE_FAILED",
      status: 500,
    });
  }

  return NextResponse.json({ ok: true });
}
