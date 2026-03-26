import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { mapSignalRows, type SignalRow } from "@/lib/signal-notifications";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";
import { listQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
    .from("signal_notifications")
    .select(
      "id, created_at, ticker, signal_type, message, source, confidence, read_at"
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(parsedQuery.data.limit);

  if (error) {
    return apiError({
      error: `Failed to load signal notifications: ${error.message}`,
      code: "SIGNAL_NOTIFICATION_QUERY_FAILED",
      status: 500,
    });
  }

  const notifications = mapSignalRows((data ?? []) as SignalRow[]);
  return NextResponse.json({ notifications });
}
