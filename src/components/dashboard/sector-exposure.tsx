"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/format";
import { getSectorColor } from "@/lib/stock-universe";

interface Position {
  ticker: string;
  marketValue: number;
}

interface SectorExposureProps {
  positions: Position[];
  sectorMap: Record<string, string>;
}

interface SectorSlice {
  sector: string;
  value: number;
  percent: number;
  holdings: number;
  fill: string;
}

export function SectorExposure({ positions, sectorMap }: SectorExposureProps) {
  const { slices, total } = useMemo(() => {
    const sectorValues: Record<string, { value: number; holdings: number }> = {};
    let totalValue = 0;

    for (const pos of positions) {
      const sector = sectorMap[pos.ticker] ?? "Other";
      const current = sectorValues[sector] ?? { value: 0, holdings: 0 };
      current.value += pos.marketValue;
      current.holdings += 1;
      sectorValues[sector] = current;
      totalValue += pos.marketValue;
    }

    const data: SectorSlice[] = Object.entries(sectorValues)
      .map(([sector, entry]) => ({
        sector,
        value: entry.value,
        percent: totalValue > 0 ? entry.value / totalValue : 0,
        holdings: entry.holdings,
        fill: getSectorColor(sector),
      }))
      .sort((a, b) => b.value - a.value);

    return { slices: data, total: totalValue };
  }, [positions, sectorMap]);

  const topSector = slices[0] ?? null;

  return (
    <Card className="h-full glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">
          Sector Exposure
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {topSector
            ? `Largest concentration: ${topSector.sector} at ${(topSector.percent * 100).toFixed(1)}%`
            : "Distribution across current IDX80 positions."}
        </p>
      </CardHeader>
      <CardContent>
        {slices.length > 0 ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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

            <div className="flex flex-1 flex-col gap-2 overflow-auto" style={{ maxHeight: 220 }}>
              {slices.map((s) => (
                <div
                  key={s.sector}
                  className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-[12px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-sm"
                      style={{ background: s.fill }}
                    />
                    <span className="flex-1 truncate font-medium">{s.sector}</span>
                    <span className="text-muted-foreground">
                      {(s.percent * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>{s.holdings} holding{s.holdings > 1 ? "s" : ""}</span>
                    <span>{formatCompactCurrency(s.value)}</span>
                  </div>
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
