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
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatShortDate,
} from "@/lib/format";
import type { EquityPoint } from "@/lib/types";

// Added 1D
type Range = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

type EquityWithBenchmark = EquityPoint & { 
  ihsgRaw: number;
  equityNormalized: number;
  ihsgNormalized: number;
};

const equityConfig = {
  equityNormalized: {
    label: "Portfolio",
    color: "var(--chart-2)",
  },
  ihsgNormalized: {
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
    
    return filteredData.map((point, index) => {
      // Mock IHSG value
      const marketDrift = index * 0.00035;
      const marketWave = Math.sin(index / 8) * 0.008 + Math.cos(index / 17) * 0.004;
      const ihsgRaw = Math.max(baseEquity * 0.75, baseEquity * (1 + marketDrift + marketWave));

      // Calculate normalized returns from the start of the period
      const equityNormalized = baseEquity !== 0 ? (point.equity - baseEquity) / baseEquity : 0;
      const ihsgNormalized = baseEquity !== 0 ? (ihsgRaw - baseEquity) / baseEquity : 0;

      return {
        ...point,
        ihsgRaw,
        equityNormalized,
        ihsgNormalized,
      };
    });
  }, [filteredData]);

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];

  const netChange = (latestPoint?.equity ?? 0) - (firstPoint?.equity ?? 0);
  const netChangeRatio =
    firstPoint && firstPoint.equity !== 0 ? netChange / firstPoint.equity : 0;

  const ihsgChange =
    firstPoint && latestPoint && firstPoint.ihsgRaw !== 0
      ? (latestPoint.ihsgRaw - firstPoint.ihsgRaw) / firstPoint.ihsgRaw
      : 0;

  const relativeOutperformance = netChangeRatio - ihsgChange;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="gap-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold">Equity</CardTitle>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as Range)}
            className="w-auto hidden sm:block"
          >
            <TabsList className="h-8">
              <TabsTrigger value="1D" className="text-xs px-2 h-6">1D</TabsTrigger>
              <TabsTrigger value="1W" className="text-xs px-2 h-6">1W</TabsTrigger>
              <TabsTrigger value="1M" className="text-xs px-2 h-6">1M</TabsTrigger>
              <TabsTrigger value="3M" className="text-xs px-2 h-6">3M</TabsTrigger>
              <TabsTrigger value="YTD" className="text-xs px-2 h-6">YTD</TabsTrigger>
              <TabsTrigger value="1Y" className="text-xs px-2 h-6">1Y</TabsTrigger>
              <TabsTrigger value="ALL" className="text-xs px-2 h-6">MAX</TabsTrigger>
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
            <p className={netChange >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
              {netChange >= 0 ? "+" : ""}{formatCurrency(netChange)} ({netChangeRatio >= 0 ? "+" : ""}{formatPercent(netChangeRatio)})
            </p>
          </div>
          <div className="space-y-1 hidden min-[400px]:block">
            <p className="text-muted-foreground">IHSG Return</p>
            <p className={ihsgChange >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
               {ihsgChange >= 0 ? "+" : ""}{formatPercent(ihsgChange)}
            </p>
          </div>
          <div className="space-y-1 hidden sm:block">
            <p className="text-muted-foreground">Alpha (Relative)</p>
            <p
              className={
                relativeOutperformance >= 0 ? "text-emerald-500 font-medium tracking-tight bg-emerald-500/10 px-1.5 py-0.5 rounded-md" : "text-red-500 font-medium tracking-tight bg-red-500/10 px-1.5 py-0.5 rounded-md"
              }
            >
              {relativeOutperformance >= 0 ? "+" : ""}
              {formatPercent(relativeOutperformance)}
            </p>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="sm:hidden pt-2">
            <Tabs
              value={range}
              onValueChange={(value) => setRange(value as Range)}
              className="w-full"
            >
              <TabsList className="w-full justify-start h-8 overflow-x-auto">
                <TabsTrigger value="1D" className="text-xs px-2 h-6">1D</TabsTrigger>
                <TabsTrigger value="1W" className="text-xs px-2 h-6">1W</TabsTrigger>
                <TabsTrigger value="1M" className="text-xs px-2 h-6">1M</TabsTrigger>
                <TabsTrigger value="3M" className="text-xs px-2 h-6">3M</TabsTrigger>
                <TabsTrigger value="YTD" className="text-xs px-2 h-6">YTD</TabsTrigger>
                <TabsTrigger value="1Y" className="text-xs px-2 h-6">1Y</TabsTrigger>
                <TabsTrigger value="ALL" className="text-xs px-2 h-6">MAX</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-end pt-0">
        <ChartContainer config={equityConfig} className="h-[250px] w-full mt-auto">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-equityNormalized)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-equityNormalized)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
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
              tickFormatter={(val) => `${val > 0 ? "+" : ""}${(val * 100).toFixed(1)}%`}
              fontSize={12}
              stroke="var(--muted-foreground)"
              dx={-5}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => formatShortDate(String(value))}
                  formatter={(value, name, item, index) => {
                     // Get the absolute raw value depending on the line
                     const rawValue = name === "equityNormalized" 
                          ? item.payload.equity 
                          : item.payload.ihsgRaw;
                     
                     return (
                         <div className="flex flex-col gap-0.5">
                             <div className="font-medium">
                                 {Number(value) > 0 ? "+" : ""}{formatPercent(Number(value))}
                             </div>
                             <div className="text-[10px] text-muted-foreground">
                                 {formatCompactCurrency(rawValue)}
                             </div>
                         </div>
                     );
                  }}
                />
              }
            />
            {/* Base Zero Line */}
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
              dataKey="ihsgNormalized"
              stroke="var(--color-ihsgNormalized)"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ChartContainer>

        <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Daily Profit & Loss
          </p>
          <ChartContainer config={pnlConfig} className="h-[90px] w-full">
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
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
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
                    fill={entry.dailyPnl >= 0 ? "var(--color-dailyPnl)" : "hsl(var(--destructive))"} 
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
