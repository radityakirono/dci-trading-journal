"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatShortDate,
} from "@/lib/format";
import type { EquityPoint } from "@/lib/types";

type Range = "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
type EquityWithBenchmark = EquityPoint & { ihsg: number };

const equityConfig = {
  equity: {
    label: "Portfolio",
    color: "var(--chart-2)",
  },
  ihsg: {
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
}

export function EquityChart({ data }: EquityChartProps) {
  const [range, setRange] = useState<Range>("3M");

  const filteredData = useMemo(() => {
    if (!data.length || range === "ALL") return data;

    const latest = toUtcDate(data[data.length - 1].date);
    const startDate = new Date(latest);

    if (range === "1W") {
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
    return filteredData.map((point, index) => {
      const marketDrift = index * 0.00035;
      const marketWave = Math.sin(index / 8) * 0.008 + Math.cos(index / 17) * 0.004;
      const ihsg = Math.max(baseEquity * 0.75, baseEquity * (1 + marketDrift + marketWave));

      return {
        ...point,
        ihsg: Math.round(ihsg),
      };
    });
  }, [filteredData]);

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];

  const netChange = (latestPoint?.equity ?? 0) - (firstPoint?.equity ?? 0);
  const netChangeRatio =
    firstPoint && firstPoint.equity !== 0 ? netChange / firstPoint.equity : 0;

  const ihsgChange =
    firstPoint && latestPoint && firstPoint.ihsg !== 0
      ? (latestPoint.ihsg - firstPoint.ihsg) / firstPoint.ihsg
      : 0;

  const relativeOutperformance = netChangeRatio - ihsgChange;

  return (
    <Card className="h-full">
      <CardHeader className="gap-4">
        <CardTitle className="text-2xl font-semibold">Equity</CardTitle>
        <div className="flex flex-wrap gap-4 text-small">
          <div className="space-y-1">
            <p className="text-muted-foreground">Current Equity</p>
            <p className="text-lg font-semibold">
              {formatCompactCurrency(latestPoint?.equity ?? 0)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Portfolio Return</p>
            <p className={netChange >= 0 ? "text-emerald-500" : "text-red-500"}>
              {formatCurrency(netChange)} ({formatPercent(netChangeRatio)})
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">IHSG Return</p>
            <p className={ihsgChange >= 0 ? "text-emerald-500" : "text-red-500"}>
              {formatPercent(ihsgChange)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Outperformance</p>
            <p
              className={
                relativeOutperformance >= 0 ? "text-emerald-500" : "text-red-500"
              }
            >
              {relativeOutperformance >= 0 ? "+" : ""}
              {formatPercent(relativeOutperformance)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={equityConfig} className="h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-equity)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-equity)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              tickFormatter={formatShortDate}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={100}
              tickFormatter={formatCompactCurrency}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatShortDate(String(value))}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="var(--color-equity)"
              strokeWidth={2.1}
              fill="url(#equityFill)"
              fillOpacity={1}
            />
            <Line
              type="monotone"
              dataKey="ihsg"
              stroke="var(--color-ihsg)"
              strokeWidth={1.8}
              dot={false}
              strokeDasharray="5 4"
            />
          </AreaChart>
        </ChartContainer>

        <div className="rounded-xl border border-border/60 p-3">
          <p className="mb-2 text-small uppercase tracking-[0.2em] text-muted-foreground">
            Daily Profit & Loss
          </p>
          <ChartContainer config={pnlConfig} className="h-[120px] w-full">
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={32}
                tickFormatter={formatShortDate}
              />
              <YAxis hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) => formatShortDate(String(value))}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="dailyPnl" fill="var(--color-dailyPnl)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as Range)}
          className="w-full"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="3M">3M</TabsTrigger>
            <TabsTrigger value="YTD">YTD</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
