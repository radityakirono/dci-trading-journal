import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import {
  requireAuthenticatedClient,
  requireWritableRole,
} from "@/lib/supabase/server-auth";
import { cashFlowEntryInputSchema, listQuerySchema } from "@/lib/validation";
import type { CashFlowEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

type CashEntryRow = {
  id: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "DIVIDEND" | "ADJUSTMENT";
  amount: number;
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
    .from("cash_journal")
    .select("id, date, type, amount, note")
    .eq("user_id", auth.user.id)
    .order("date", { ascending: false })
    .limit(parsedQuery.data.limit);

  if (error) {
    return apiError({
      error: `Failed to load cash journal: ${error.message}`,
      code: "CASH_JOURNAL_QUERY_FAILED",
      status: 500,
    });
  }

  const entries: CashFlowEntry[] = ((data ?? []) as CashEntryRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount,
    note: row.note ?? undefined,
  }));

  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;
  const readOnlyResponse = requireWritableRole(auth.role);
  if (readOnlyResponse) return readOnlyResponse;

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

  const parsedBody = cashFlowEntryInputSchema.safeParse(body);
  if (!parsedBody.success) {
    return apiError({
      error: parsedBody.error.issues[0]?.message ?? "Invalid cash journal payload.",
      code: "INVALID_PAYLOAD",
      status: 400,
    });
  }

  const entry = parsedBody.data;

  const { data, error } = await auth.client
    .from("cash_journal")
    .insert({
      id: crypto.randomUUID(),
      user_id: auth.user.id,
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
      note: entry.note ?? null,
    })
    .select("id, date, type, amount, note")
    .single();

  if (error || !data) {
    return apiError({
      error: `Failed to create cash journal entry: ${error?.message ?? "Unknown error"}`,
      code: "CASH_JOURNAL_CREATE_FAILED",
      status: 500,
    });
  }

  return NextResponse.json(
    {
      entry: {
        id: data.id,
        date: data.date,
        type: data.type,
        amount: data.amount,
        note: data.note ?? undefined,
      } satisfies CashFlowEntry,
    },
    { status: 201 }
  );
}
