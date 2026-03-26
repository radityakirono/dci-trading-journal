import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { upsertNotifications } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { calculateBrokerFee } from "@/lib/trading";
import {
  requireAuthenticatedClient,
  requireWritableRole,
} from "@/lib/supabase/server-auth";
import { listQuerySchema, transactionInputSchema } from "@/lib/validation";
import type { Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

type TransactionRow = {
  id: string;
  date: string;
  ticker: string;
  side: "BUY" | "SELL";
  strategy:
    | "Signal-Based"
    | "Breakout"
    | "Swing Trade"
    | "Value Investing"
    | "Momentum"
    | "Manual";
  quantity: number;
  price: number;
  fee: number;
  note?: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  const parsedQuery = listQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit"),
  });
  if (!parsedQuery.success) {
    return apiError({
      error: "Invalid query parameters.",
      code: "INVALID_QUERY",
      status: 400,
    });
  }

  const { data, error } = await auth.client
    .from("transactions")
    .select("id, date, ticker, side, strategy, quantity, price, fee, note")
    .eq("user_id", auth.user.id)
    .order("date", { ascending: false })
    .limit(parsedQuery.data.limit);

  if (error) {
    return apiError({
      error: `Failed to load transactions: ${error.message}`,
      code: "TRANSACTION_QUERY_FAILED",
      status: 500,
    });
  }

  const transactions: Transaction[] = ((data ?? []) as TransactionRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    ticker: row.ticker,
    side: row.side,
    strategy: row.strategy,
    quantity: row.quantity,
    price: row.price,
    fee: row.fee,
    note: row.note ?? undefined,
  }));

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;
  const readOnlyResponse = requireWritableRole(auth.role);
  if (readOnlyResponse) return readOnlyResponse;

  const rateLimit = checkRateLimit(`transactions:${auth.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return apiError({
      error: "Order rate limit exceeded. Please wait before placing another order.",
      code: "RATE_LIMITED",
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    });
  }

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

  const parsedBody = transactionInputSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError({
      error: parsedBody.error.issues[0]?.message ?? "Invalid transaction payload.",
      code: "INVALID_PAYLOAD",
      status: 400,
    });
  }

  const transaction = parsedBody.data;
  const fee = calculateBrokerFee(
    transaction.side,
    transaction.quantity,
    transaction.price
  );

  const { data, error } = await auth.client
    .from("transactions")
    .insert({
      id: crypto.randomUUID(),
      user_id: auth.user.id,
      date: transaction.date,
      ticker: transaction.ticker,
      side: transaction.side,
      strategy: transaction.strategy,
      quantity: transaction.quantity,
      price: transaction.price,
      fee,
      note: transaction.note ?? null,
    })
    .select("id, date, ticker, side, strategy, quantity, price, fee, note")
    .single();

  if (error || !data) {
    return apiError({
      error: `Failed to create transaction: ${error?.message ?? "Unknown error"}`,
      code: "TRANSACTION_CREATE_FAILED",
      status: 500,
    });
  }

  let warning: string | undefined;

  if (transaction.signalId) {
    const { error: signalActionError } = await auth.client.from("signal_actions").upsert(
      {
        user_id: auth.user.id,
        signal_id: transaction.signalId,
        status: "EXECUTED",
        action_date: new Date().toISOString(),
        linked_transaction_id: data.id,
        executed_price: transaction.price,
        executed_quantity: transaction.quantity,
      },
      {
        onConflict: "user_id,signal_id",
      }
    );

    if (signalActionError) {
      console.error("Failed to update signal execution state:", signalActionError.message);
      warning = `Transaction saved, but signal status could not be synced: ${signalActionError.message}`;
    }
  }

  try {
    await upsertNotifications(auth.client, [
      {
        userId: auth.user.id,
        type: "ORDER_PLACED",
        message: `Order placed: ${transaction.side} ${transaction.quantity} lots ${transaction.ticker} @ Rp ${transaction.price.toLocaleString("id-ID")}`,
        relatedEntityType: "TRANSACTION",
        relatedEntityId: data.id,
        metadata: {
          transactionId: data.id,
          ticker: transaction.ticker,
          side: transaction.side,
          quantity: transaction.quantity,
          price: transaction.price,
          strategy: transaction.strategy,
        },
      },
      ...(transaction.signalId
        ? [
            {
              userId: auth.user.id,
              type: "SIGNAL_EXECUTED" as const,
              message: `Signal executed: ${transaction.side} ${transaction.quantity} lots ${transaction.ticker} @ Rp ${transaction.price.toLocaleString("id-ID")}`,
              relatedEntityType: "SIGNAL",
              relatedEntityId: transaction.signalId,
              metadata: {
                signalId: transaction.signalId,
                transactionId: data.id,
                ticker: transaction.ticker,
                side: transaction.side,
                quantity: transaction.quantity,
                price: transaction.price,
              },
            },
          ]
        : []),
    ]);
  } catch (notificationError) {
    const message =
      notificationError instanceof Error
        ? notificationError.message
        : "Failed to create notifications.";
    console.error(message);
  }

  return NextResponse.json(
    {
      transaction: {
        id: data.id,
        date: data.date,
        ticker: data.ticker,
        side: data.side,
        strategy: data.strategy,
        quantity: data.quantity,
        price: data.price,
        fee: data.fee,
        note: data.note ?? undefined,
      } satisfies Transaction,
      warning,
    },
    { status: 201 }
  );
}
