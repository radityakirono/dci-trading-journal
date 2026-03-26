import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedClient } from "@/lib/supabase/server-auth";
import type { BenchmarkPoint } from "@/lib/benchmark";
import { yahooFinance } from "@/lib/yahoo-finance";

export const dynamic = "force-dynamic";

type ChartRow = {
  date: Date;
  close: number | null;
};

function isValidDateParam(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toInclusiveEndDate(value: string) {
  const endDate = new Date(`${value}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return endDate;
}

function normalizeRange(request: NextRequest) {
  const startParam = request.nextUrl.searchParams.get("period1");
  const endParam = request.nextUrl.searchParams.get("period2");
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date();
  defaultStart.setUTCFullYear(defaultStart.getUTCFullYear() - 2);

  const startDate = isValidDateParam(startParam)
    ? startParam!
    : defaultStart.toISOString().slice(0, 10);
  const endDate = isValidDateParam(endParam) ? endParam! : today;

  if (startDate <= endDate) {
    return { startDate, endDate };
  }

  return { startDate: endDate, endDate: startDate };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedClient(request);
  if ("error" in auth) return auth.error;

  const { startDate, endDate } = normalizeRange(request);

  try {
    const result = await yahooFinance.chart("^JKSE", {
      period1: startDate,
      period2: toInclusiveEndDate(endDate),
      interval: "1d",
    });

    const rows = Array.isArray(result?.quotes) ? (result.quotes as ChartRow[]) : [];
    const series: BenchmarkPoint[] = rows
      .filter((row) => row.date instanceof Date && typeof row.close === "number")
      .map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        close: row.close as number,
      }))
      .sort((left, right) => left.date.localeCompare(right.date));

    return NextResponse.json(
      {
        benchmark: {
          symbol: "^JKSE",
          label: "IHSG",
          source: "yahoo",
          period1: startDate,
          period2: endDate,
          series,
        },
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("IHSG benchmark API error:", error);
    return NextResponse.json(
      {
        benchmark: {
          symbol: "^JKSE",
          label: "IHSG",
          source: "unavailable",
          period1: startDate,
          period2: endDate,
          series: [] satisfies BenchmarkPoint[],
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
