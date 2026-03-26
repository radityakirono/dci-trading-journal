import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";

function normalizeCacheChangePct(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.abs(value) > 1 ? value / 100 : value;
}

/**
 * GET /api/market-data
 * Returns near-real-time stock prices from the Supabase market_data_cache table.
 * This data is pushed by the VPS market_stream.py module.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("market_data_cache")
      .select("ticker, price, prev_close, change_pct, volume, updated_at")
      .order("ticker", { ascending: true });

    if (error) {
      console.error("[/api/market-data] Supabase error:", error.message);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const normalizedData = (data ?? []).map((row) => ({
      ...row,
      change_pct: normalizeCacheChangePct(row.change_pct),
    }));

    return NextResponse.json({ data: normalizedData });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
