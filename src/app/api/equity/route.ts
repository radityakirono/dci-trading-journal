import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";

/**
 * GET /api/equity
 * Returns equity snapshots from the Supabase equity_snapshots table.
 * Falls back to an empty array if the table has no data yet.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("equity_snapshots")
      .select("date, cash, holdings_value, total_equity")
      .order("date", { ascending: true })
      .limit(365);

    if (error) {
      console.error("[/api/equity] Supabase error:", error.message);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Map to the EquityPoint format the frontend expects
    const equityPoints = (data ?? []).map((row: Record<string, unknown>) => ({
      date: row.date as string,
      equity: Number(row.total_equity ?? 0),
      dailyPnl: 0, // Will be computed client-side from consecutive days
    }));

    // Compute daily P&L from consecutive points
    for (let i = 1; i < equityPoints.length; i++) {
      equityPoints[i].dailyPnl = equityPoints[i].equity - equityPoints[i - 1].equity;
    }

    return NextResponse.json({ data: equityPoints });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
