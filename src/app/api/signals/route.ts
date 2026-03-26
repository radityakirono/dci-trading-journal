import { NextRequest, NextResponse } from "next/server";

import { mergeSignalsWithActions, type QuantSignalRow, type SignalActionRow } from "@/lib/signals";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  requireAuthenticatedClient,
  requireWritableRole,
} from "@/lib/supabase/server-auth";
import { listQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
    const signalType = request.nextUrl.searchParams.get("signal_type");
    const limit = Math.min(parsedQuery.data.limit, 100);
    const supabaseAdmin = getSupabaseAdmin();

    let signalQuery = supabaseAdmin
      .from("quant_signals")
      .select(
        `
        id,
        created_at,
        signal_ts,
        ticker,
        ticker_short,
        signal_type,
        message,
        source,
        conviction,
        regime,
        trade_ticket
      `
      )
      .order("signal_ts", { ascending: false })
      .limit(limit);

    if (signalType) {
      signalQuery = signalQuery.eq("signal_type", signalType);
    }

    const { data: rawSignals, error: signalsError } = await signalQuery;

    if (signalsError) {
      return NextResponse.json(
        { error: signalsError.message, code: "SIGNAL_QUERY_FAILED" },
        { status: 500 }
      );
    }

    const signalRows = (rawSignals ?? []) as QuantSignalRow[];
    const signalIds = signalRows.map((row) => row.id);

    let signalActions: SignalActionRow[] = [];
    if (signalIds.length > 0) {
      const { data: actionRows, error: actionsError } = await auth.client
        .from("signal_actions")
        .select("signal_id, status, action_date, linked_transaction_id")
        .eq("user_id", auth.user.id)
        .in("signal_id", signalIds);

      if (actionsError) {
        return NextResponse.json(
          { error: actionsError.message, code: "SIGNAL_ACTIONS_QUERY_FAILED" },
          { status: 500 }
        );
      }

      signalActions = (actionRows ?? []) as SignalActionRow[];
    }

    const signals = mergeSignalsWithActions(signalRows, signalActions);
    return NextResponse.json({ signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;
  const readOnlyResponse = requireWritableRole(auth.role);
  if (readOnlyResponse) return readOnlyResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const status = typeof (body as { status?: unknown }).status === "string"
    ? (body as { status: string }).status
    : null;
  const signalId = typeof (body as { signalId?: unknown }).signalId === "string"
    ? (body as { signalId: string }).signalId
    : null;

  if (!signalId || !status || !["DISMISSED", "EXECUTED"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid signal action payload.", code: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const { error } = await auth.client.from("signal_actions").upsert(
    {
      user_id: auth.user.id,
      signal_id: signalId,
      status,
      action_date: new Date().toISOString(),
    },
    {
      onConflict: "user_id,signal_id",
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "SIGNAL_ACTION_UPSERT_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
