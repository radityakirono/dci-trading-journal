import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/market-data
 * Returns near-real-time stock prices from the Supabase market_data_cache table.
 * This data is pushed by the VPS market_stream.py module.
 */
export async function GET() {
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

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
