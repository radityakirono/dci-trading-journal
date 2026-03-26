/**
 * GET /api/signal-runs — Fetch pipeline run history.
 *
 * Shows the engine execution log so the dashboard can
 * display pipeline health and run history.
 */
import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api-response";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit") ?? "20";
    const parsedLimit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return apiError({
        error: "Invalid query parameters.",
        code: "INVALID_QUERY",
        status: 400,
      });
    }

    const limit = Math.min(parsedLimit, 100);

    const { data, error } = await supabaseAdmin
      .from("signal_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[API /signal-runs] Supabase error:", error);
      return apiError({
        error: error.message,
        code: "SIGNAL_RUN_QUERY_FAILED",
        status: 500,
      });
    }

    return NextResponse.json({ runs: data || [] });
  } catch (err) {
    console.error("[API /signal-runs] Unexpected error:", err);
    return apiError({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    });
  }
}
