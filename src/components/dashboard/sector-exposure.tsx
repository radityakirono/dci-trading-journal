"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/format";

interface Position {
  ticker: string;
  marketValue: number;
}

interface SectorExposureProps {
  positions: Position[];
  sectorMap: Record<string, string>;
}

const SECTOR_COLORS: Record<string, string> = {
  Financials: "#3b82f6",
  "Consumer Staples": "#22c55e",
  Energy: "#f59e0b",
  Industrials: "#8b5cf6",
  Telecommunications: "#06b6d4",
  Technology: "#ec4899",
  Materials: "#f97316",
  "Consumer Discretionary": "#14b8a6",
  Healthcare: "#10b981",
  "Real Estate": "#6366f1",
  Utilities: "#84cc16",
  Transportation: "#a855f7",
  Infrastructure: "#64748b",
};

interface SectorSlice {
  sector: string;
  value: number;
  percent: number;
  fill: string;
}

export function SectorExposure({ positions, sectorMap }: SectorExposureProps) {
  const { slices, total } = useMemo(() => {
    const sectorValues: Record<string, number> = {};
    let totalValue = 0;

    for (const pos of positions) {
      const sector = sectorMap[pos.ticker] ?? "Other";
      sectorValues[sector] = (sectorValues[sector] ?? 0) + pos.marketValue;
      totalValue += pos.marketValue;
    }

    const data: SectorSlice[] = Object.entries(sectorValues)
      .map(([sector, value]) => ({
        sector,
        value,
        percent: totalValue > 0 ? value / totalValue : 0,
        fill: SECTOR_COLORS[sector] ?? "#64748b",
      }))
      .sort((a, b) => b.value - a.value);

    return { slices: data, total: totalValue };
  }, [positions, sectorMap]);

  return (
    <Card className="h-full glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">
          Sector Exposure
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {slices.map((entry) => (
                      <Cell key={entry.sector} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload as SectorSlice;
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
                          <p className="font-semibold">{d.sector}</p>
                          <p className="text-muted-foreground">
                            {formatCompactCurrency(d.value)} · {(d.percent * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <span className="text-sm font-semibold">
                  {formatCompactCurrency(total)}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 overflow-auto" style={{ maxHeight: 180 }}>
              {slices.map((s) => (
                <div key={s.sector} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: s.fill }}
                  />
                  <span className="flex-1 truncate">{s.sector}</span>
                  <span className="text-muted-foreground">
                    {(s.percent * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No positions to analyze.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
