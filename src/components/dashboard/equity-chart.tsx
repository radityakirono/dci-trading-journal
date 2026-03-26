"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildNormalizedBenchmarkSeries,
  formatBenchmarkValue,
  getBenchmarkReturn,
  type BenchmarkPoint,
} from "@/lib/benchmark";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatShortDate,
} from "@/lib/format";
import type { EquityPoint } from "@/lib/types";

type Range = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

type EquityWithBenchmark = EquityPoint & {
  benchmarkClose: number | null;
  equityNormalized: number;
  benchmarkNormalized: number | null;
};

const equityConfig = {
  equityNormalized: {
    label: "Portfolio",
    color: "var(--chart-2)",
  },
  benchmarkNormalized: {
    label: "IHSG",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const pnlConfig = {
  dailyPnl: {
    label: "Daily P/L",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface EquityChartProps {
  data: EquityPoint[];
  benchmarkSeries?: BenchmarkPoint[];
  isBenchmarkLoading?: boolean;
}

export function EquityChart({
  data,
  benchmarkSeries = [],
  isBenchmarkLoading = false,
}: EquityChartProps) {
  const [range, setRange] = useState<Range>("3M");

  const filteredData = useMemo(() => {
    if (!data.length || range === "ALL") return data;

    const latest = toUtcDate(data[data.length - 1].date);
    const startDate = new Date(latest);

    if (range === "1D") {
      startDate.setUTCDate(startDate.getUTCDate() - 1);
    } else if (range === "1W") {
      startDate.setUTCDate(startDate.getUTCDate() - 7);
    } else if (range === "1M") {
      startDate.setUTCDate(startDate.getUTCDate() - 30);
    } else if (range === "3M") {
      startDate.setUTCDate(startDate.getUTCDate() - 90);
    } else if (range === "1Y") {
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
    } else if (range === "YTD") {
      startDate.setUTCMonth(0, 1);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    return data.filter((point) => toUtcDate(point.date) >= startDate);
  }, [data, range]);

  const chartData = useMemo<EquityWithBenchmark[]>(() => {
    if (!filteredData.length) return [];

    const baseEquity = filteredData[0].equity;
    const benchmarkOverlay = buildNormalizedBenchmarkSeries(filteredData, benchmarkSeries);

    return filteredData.map((point, index) => ({
      ...point,
      benchmarkClose: benchmarkOverlay[index]?.benchmarkClose ?? null,
      equityNormalized: baseEquity !== 0 ? (point.equity - baseEquity) / baseEquity : 0,
      benchmarkNormalized: benchmarkOverlay[index]?.benchmarkReturn ?? null,
    }));
  }, [benchmarkSeries, filteredData]);

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const netChange = (latestPoint?.equity ?? 0) - (firstPoint?.equity ?? 0);
  const portfolioReturn =
    firstPoint && firstPoint.equity !== 0 ? netChange / firstPoint.equity : null;
  const benchmarkReturn =
    filteredData.length > 0
      ? getBenchmarkReturn(
          benchmarkSeries,
          filteredData[0].date,
          filteredData[filteredData.length - 1].date
        )
      : null;
  const relativeOutperformance =
    portfolioReturn != null && benchmarkReturn != null
      ? portfolioReturn - benchmarkReturn
      : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold">Equity</CardTitle>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as Range)}
            className="hidden w-auto sm:block"
          >
            <TabsList className="h-8" aria-label="Select equity chart timeframe">
              <TabsTrigger value="1D" className="h-6 px-2 text-xs">1D</TabsTrigger>
              <TabsTrigger value="1W" className="h-6 px-2 text-xs">1W</TabsTrigger>
              <TabsTrigger value="1M" className="h-6 px-2 text-xs">1M</TabsTrigger>
              <TabsTrigger value="3M" className="h-6 px-2 text-xs">3M</TabsTrigger>
              <TabsTrigger value="YTD" className="h-6 px-2 text-xs">YTD</TabsTrigger>
              <TabsTrigger value="1Y" className="h-6 px-2 text-xs">1Y</TabsTrigger>
              <TabsTrigger value="ALL" className="h-6 px-2 text-xs">MAX</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-5 text-small">
          <div className="space-y-1">
            <p className="text-muted-foreground">Current Equity</p>
            <p className="text-lg font-semibold">
              {formatCompactCurrency(latestPoint?.equity ?? 0)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Portfolio Return</p>
            <p
              className={
                (portfolioReturn ?? 0) >= 0
                  ? "font-medium text-emerald-500"
                  : "font-medium text-red-500"
              }
            >
              {netChange >= 0 ? "+" : ""}
              {formatCurrency(netChange)}{" "}
              ({portfolioReturn != null ? `${portfolioReturn >= 0 ? "+" : ""}${formatPercent(portfolioReturn)}` : "N/A"})
            </p>
          </div>
          <div className="hidden min-[400px]:block space-y-1">
            <p className="text-muted-foreground">IHSG Return</p>
            <p
              className={
                benchmarkReturn == null
                  ? "font-medium text-muted-foreground"
                  : benchmarkReturn >= 0
                    ? "font-medium text-emerald-500"
                    : "font-medium text-red-500"
              }
            >
              {benchmarkReturn != null
                ? `${benchmarkReturn >= 0 ? "+" : ""}${formatPercent(benchmarkReturn)}`
                : isBenchmarkLoading
                  ? "Loading..."
                  : "N/A"}
            </p>
          </div>
          <div className="hidden space-y-1 sm:block">
            <p className="text-muted-foreground">Alpha (Relative)</p>
            <p
              className={
                relativeOutperformance == null
                  ? "rounded-md bg-muted/30 px-1.5 py-0.5 font-medium tracking-tight text-muted-foreground"
                  : relativeOutperformance >= 0
                    ? "rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-medium tracking-tight text-emerald-500"
                    : "rounded-md bg-red-500/10 px-1.5 py-0.5 font-medium tracking-tight text-red-500"
              }
            >
              {relativeOutperformance != null
                ? `${relativeOutperformance >= 0 ? "+" : ""}${formatPercent(relativeOutperformance)}`
                : isBenchmarkLoading
                  ? "Loading..."
                  : "N/A"}
            </p>
          </div>
        </div>

        <div className="pt-2 sm:hidden">
          <p className="mb-2 text-xs text-muted-foreground">
            Swipe to change the chart timeframe.
          </p>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as Range)}
            className="w-full"
          >
            <TabsList
              className="h-8 w-full justify-start overflow-x-auto"
              aria-label="Select equity chart timeframe"
            >
              <TabsTrigger value="1D" className="h-6 px-2 text-xs">1D</TabsTrigger>
              <TabsTrigger value="1W" className="h-6 px-2 text-xs">1W</TabsTrigger>
              <TabsTrigger value="1M" className="h-6 px-2 text-xs">1M</TabsTrigger>
              <TabsTrigger value="3M" className="h-6 px-2 text-xs">3M</TabsTrigger>
              <TabsTrigger value="YTD" className="h-6 px-2 text-xs">YTD</TabsTrigger>
              <TabsTrigger value="1Y" className="h-6 px-2 text-xs">1Y</TabsTrigger>
              <TabsTrigger value="ALL" className="h-6 px-2 text-xs">MAX</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end space-y-4 pt-0">
        <ChartContainer
          config={equityConfig}
          className="mt-auto h-[250px] w-full"
          role="img"
          aria-label="Portfolio equity performance compared with the IHSG benchmark"
        >
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-equityNormalized)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-equityNormalized)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              tickFormatter={formatShortDate}
              fontSize={12}
              stroke="var(--muted-foreground)"
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={65}
              tickFormatter={(value) => `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`}
              fontSize={12}
              stroke="var(--muted-foreground)"
              dx={-5}
            />
            <ChartTooltip
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatShortDate(String(value))}
                  formatter={(value, name, item) => {
                    const rawValue =
                      name === "equityNormalized"
                        ? formatCompactCurrency(item.payload.equity)
                        : formatBenchmarkValue(item.payload.benchmarkClose);

                    return (
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium">
                          {Number(value) > 0 ? "+" : ""}
                          {formatPercent(Number(value))}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{rawValue}</div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Line
              type="linear"
              dataKey={() => 0}
              stroke="var(--border)"
              strokeWidth={1}
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="equityNormalized"
              stroke="var(--color-equityNormalized)"
              strokeWidth={2.5}
              fill="url(#equityFill)"
              fillOpacity={1}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="benchmarkNormalized"
              stroke="var(--color-benchmarkNormalized)"
              strokeWidth={1.8}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ChartContainer>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Daily Profit &amp; Loss
          </p>
          <ChartContainer
            config={pnlConfig}
            className="h-[90px] w-full"
            role="img"
            aria-label="Daily profit and loss bar chart"
          >
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={32}
                tickFormatter={formatShortDate}
                hide
              />
              <YAxis hide />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) => formatShortDate(String(value))}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="dailyPnl" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.dailyPnl >= 0
                        ? "var(--color-dailyPnl)"
                        : "hsl(var(--destructive))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
