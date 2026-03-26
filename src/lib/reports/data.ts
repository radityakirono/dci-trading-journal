import type { MarketPriceSnapshot } from "@/lib/market";
import { getBenchmarkReturn, type BenchmarkPoint } from "@/lib/benchmark";
import { buildCashLedger, getAvailableCash } from "@/lib/portfolio";
import { calculateGrossTradeValue, SHARES_PER_LOT, TRADE_STRATEGIES } from "@/lib/trading";
import { calculateWinRateStats } from "@/lib/win-rate";
import type { CashFlowEntry, EquityPoint, Transaction } from "@/lib/types";

export type ExportReportType =
  | "PORTFOLIO_SUMMARY"
  | "TRADE_JOURNAL"
  | "STRATEGY_PERFORMANCE"
  | "FULL_REPORT";

export type ExportPeriod = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "YTD" | "CUSTOM";
export type ExportFormat = "PDF" | "EXCEL";
export type ExportSection =
  | "summary"
  | "positions"
  | "transactions"
  | "strategy"
  | "cashFlow";

export interface ExportOptions {
  reportType: ExportReportType;
  period: ExportPeriod;
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
}

export interface ReportDateRange {
  start: string;
  end: string;
  label: string;
}

export interface ReportSummary {
  portfolioValue: number;
  portfolioReturnPct: number | null;
  winRate: number | null;
  closedTrades: number;
  winRateSmallSample: boolean;
  maxDrawdown: number | null;
  alphaVsIhsg: number | null;
  availableCash: number;
  activeSignals: number;
}

export interface ReportPosition {
  ticker: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  dayChange: number;
  dayChangePct: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  weight: number;
}

export interface ReportTransactionRow {
  id: string;
  date: string;
  ticker: string;
  side: Transaction["side"];
  strategy: Transaction["strategy"];
  quantity: number;
  price: number;
  fee: number;
  note?: string;
  cashImpact: number;
}

export interface ReportStrategyRow {
  label: string;
  returnPct: number | null;
  winRate: number | null;
  trades: number;
  closedTrades: number;
  winRateSmallSample: boolean;
  sharpe: number | null;
}

export interface ReportData {
  options: ExportOptions;
  dateRange: ReportDateRange;
  generatedAt: string;
  reportTitle: string;
  fileBaseName: string;
  summary: ReportSummary;
  positions: ReportPosition[];
  transactions: ReportTransactionRow[];
  strategyPerformance: ReportStrategyRow[];
  cashFlow: ReturnType<typeof buildCashLedger>;
}

export interface BuildReportDataInput {
  transactions: Transaction[];
  cashJournal: CashFlowEntry[];
  equitySeries: EquityPoint[];
  marketPrices: Record<string, number>;
  marketData?: Record<string, MarketPriceSnapshot>;
  activeSignalCount?: number;
  benchmarkSeries?: BenchmarkPoint[];
}

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  TODAY: "Today",
  THIS_WEEK: "This Week",
  THIS_MONTH: "This Month",
  YTD: "YTD",
  CUSTOM: "Custom Range",
};

const REPORT_LABELS: Record<ExportReportType, string> = {
  PORTFOLIO_SUMMARY: "Portfolio Summary",
  TRADE_JOURNAL: "Trade Journal",
  STRATEGY_PERFORMANCE: "Strategy Performance",
  FULL_REPORT: "Full Report",
};

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function startOfCurrentWeek(date: Date) {
  const next = new Date(date);
  const currentDay = next.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  next.setDate(next.getDate() + diffToMonday);
  return next;
}

function isDateWithinRange(value: string, range: ReportDateRange) {
  return value >= range.start && value <= range.end;
}

function calculateMaxDrawdown(points: EquityPoint[]) {
  if (points.length === 0) return null;

  let peak = 0;
  let worst = 0;

  for (const point of points) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
    if (drawdown > worst) worst = drawdown;
  }

  return worst;
}

function calculatePeriodReturn(points: EquityPoint[]) {
  if (points.length < 2) return null;

  const firstEquity = points[0]?.equity ?? 0;
  const lastEquity = points[points.length - 1]?.equity ?? 0;
  if (firstEquity <= 0) return null;

  return (lastEquity - firstEquity) / firstEquity;
}

function buildPositions(
  transactions: Transaction[],
  marketPrices: Record<string, number>,
  marketData: Record<string, MarketPriceSnapshot> = {}
) {
  const positionMap = new Map<string, { quantity: number; costBasis: number; marketPrice: number }>();

  for (const transaction of transactions) {
    const current = positionMap.get(transaction.ticker) ?? {
      quantity: 0,
      costBasis: 0,
      marketPrice: marketPrices[transaction.ticker] ?? transaction.price,
    };

    if (transaction.side === "BUY") {
      current.quantity += transaction.quantity;
      current.costBasis +=
        transaction.quantity * SHARES_PER_LOT * transaction.price + transaction.fee;
    } else {
      const sellLots = Math.min(transaction.quantity, current.quantity);
      const averageCostPerLot = current.quantity > 0 ? current.costBasis / current.quantity : 0;
      current.quantity -= sellLots;
      current.costBasis = Math.max(0, current.costBasis - averageCostPerLot * sellLots);
    }

    current.marketPrice = marketPrices[transaction.ticker] ?? current.marketPrice;
    positionMap.set(transaction.ticker, current);
  }

  const rawPositions = Array.from(positionMap.entries())
    .map(([ticker, value]) => {
      const averageCost =
        value.quantity > 0 ? value.costBasis / (value.quantity * SHARES_PER_LOT) : 0;
      const marketValue = value.quantity * SHARES_PER_LOT * value.marketPrice;
      const unrealizedPnL = marketValue - value.costBasis;
      const unrealizedPnLPct = value.costBasis > 0 ? unrealizedPnL / value.costBasis : 0;
      const snapshot = marketData[ticker];
      const dayChange = snapshot?.change ?? 0;
      const dayChangePct =
        snapshot?.prevClose && snapshot.prevClose > 0
          ? dayChange / snapshot.prevClose
          : value.marketPrice > 0
            ? dayChange / value.marketPrice
            : 0;

      return {
        ticker,
        quantity: value.quantity,
        averageCost,
        marketPrice: value.marketPrice,
        dayChange,
        dayChangePct,
        marketValue,
        costBasis: value.costBasis,
        unrealizedPnL,
        unrealizedPnLPct,
        weight: 0,
      } satisfies ReportPosition;
    })
    .filter((position) => position.quantity > 0);

  const totalMarketValue = rawPositions.reduce((sum, position) => sum + position.marketValue, 0);

  return rawPositions
    .map((position) => ({
      ...position,
      weight: totalMarketValue > 0 ? position.marketValue / totalMarketValue : 0,
    }))
    .sort((left, right) => right.marketValue - left.marketValue);
}

function buildTransactionRows(transactions: Transaction[]): ReportTransactionRow[] {
  return [...transactions]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((transaction) => {
      const gross = calculateGrossTradeValue(transaction.quantity, transaction.price);
      const cashImpact =
        transaction.side === "BUY" ? -(gross + transaction.fee) : gross - transaction.fee;

      return {
        id: transaction.id,
        date: transaction.date,
        ticker: transaction.ticker,
        side: transaction.side,
        strategy: transaction.strategy,
        quantity: transaction.quantity,
        price: transaction.price,
        fee: transaction.fee,
        note: transaction.note,
        cashImpact,
      };
    });
}

export function buildStrategyPerformanceRows(
  transactions: Transaction[],
  equitySeries: EquityPoint[],
  now = new Date()
): ReportStrategyRow[] {
  function statsForDays(days: number, label: string): ReportStrategyRow {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const periodTrades = transactions.filter((transaction) => transaction.date >= cutoffStr);
    const periodEquity = equitySeries.filter((point) => point.date >= cutoffStr);
    const { winRate, closedTrades, hasSmallSample } = calculateWinRateStats(periodTrades);

    const dailyReturns = periodEquity
      .map((point, index) => {
        if (index === 0) return 0;
        const previousEquity = periodEquity[index - 1]?.equity ?? 0;
        return previousEquity > 0 ? (point.equity - previousEquity) / previousEquity : 0;
      })
      .slice(1);

    let sharpe: number | null = null;
    if (dailyReturns.length > 5) {
      const mean = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
      const variance =
        dailyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        dailyReturns.length;
      const stddev = Math.sqrt(variance);
      sharpe = stddev > 0 ? (mean / stddev) * Math.sqrt(252) : null;
    }

    return {
      label,
      returnPct:
        periodEquity.length > 1
          ? calculatePeriodReturn(periodEquity)
          : null,
      winRate,
      trades: periodTrades.length,
      closedTrades,
      winRateSmallSample: hasSmallSample,
      sharpe,
    };
  }

  return [
    statsForDays(1, "Today"),
    statsForDays(7, "1 Week"),
    statsForDays(30, "1 Month"),
    statsForDays(365, "YTD"),
  ];
}

export function resolveReportDateRange(
  period: ExportPeriod,
  startDate?: string,
  endDate?: string,
  now = new Date()
): ReportDateRange {
  const todayKey = formatDateKey(now);

  switch (period) {
    case "TODAY":
      return {
        start: todayKey,
        end: todayKey,
        label: PERIOD_LABELS.TODAY,
      };
    case "THIS_WEEK":
      return {
        start: formatDateKey(startOfCurrentWeek(now)),
        end: todayKey,
        label: PERIOD_LABELS.THIS_WEEK,
      };
    case "THIS_MONTH": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: formatDateKey(firstDay),
        end: todayKey,
        label: PERIOD_LABELS.THIS_MONTH,
      };
    }
    case "CUSTOM": {
      const safeStart = startDate ?? todayKey;
      const safeEnd = endDate ?? safeStart;
      return {
        start: safeStart <= safeEnd ? safeStart : safeEnd,
        end: safeStart <= safeEnd ? safeEnd : safeStart,
        label: `${safeStart} to ${safeEnd}`,
      };
    }
    case "YTD":
    default:
      return {
        start: `${now.getFullYear()}-01-01`,
        end: todayKey,
        label: PERIOD_LABELS.YTD,
      };
  }
}

export function buildReportData(
  input: BuildReportDataInput,
  options: ExportOptions
): ReportData {
  const generatedAt = new Date();
  const dateRange = resolveReportDateRange(options.period, options.startDate, options.endDate, generatedAt);
  const positions = buildPositions(input.transactions, input.marketPrices, input.marketData);
  const transactions = buildTransactionRows(input.transactions).filter((transaction) =>
    isDateWithinRange(transaction.date, dateRange)
  );
  const cashFlow = buildCashLedger(input.cashJournal, input.transactions).filter((entry) =>
    isDateWithinRange(entry.date, dateRange)
  );
  const filteredEquity = input.equitySeries.filter((point) => isDateWithinRange(point.date, dateRange));
  const filteredTransactions = input.transactions.filter((transaction) =>
    isDateWithinRange(transaction.date, dateRange)
  );
  const benchmarkReturn =
    input.benchmarkSeries && input.benchmarkSeries.length > 0
      ? getBenchmarkReturn(input.benchmarkSeries, dateRange.start, dateRange.end)
      : null;
  const { winRate, closedTrades, hasSmallSample } = calculateWinRateStats(filteredTransactions);
  const strategyPerformance = buildStrategyPerformanceRows(input.transactions, input.equitySeries, generatedAt);
  const portfolioReturnPct = calculatePeriodReturn(filteredEquity);

  return {
    options,
    dateRange,
    generatedAt: generatedAt.toISOString(),
    reportTitle: REPORT_LABELS[options.reportType],
    fileBaseName: `DCI_Report_${options.period}_${dateRange.end}`,
    summary: {
      portfolioValue: positions.reduce((sum, position) => sum + position.marketValue, 0),
      portfolioReturnPct,
      winRate,
      closedTrades,
      winRateSmallSample: hasSmallSample,
      maxDrawdown: calculateMaxDrawdown(filteredEquity),
      alphaVsIhsg:
        portfolioReturnPct != null && benchmarkReturn != null
          ? portfolioReturnPct - benchmarkReturn
          : null,
      availableCash: getAvailableCash(input.cashJournal, input.transactions),
      activeSignals: input.activeSignalCount ?? 0,
    },
    positions,
    transactions,
    strategyPerformance,
    cashFlow,
  };
}

export function getExportSections(reportType: ExportReportType): ExportSection[] {
  switch (reportType) {
    case "PORTFOLIO_SUMMARY":
      return ["summary", "positions"] satisfies ExportSection[];
    case "TRADE_JOURNAL":
      return ["summary", "transactions"] satisfies ExportSection[];
    case "STRATEGY_PERFORMANCE":
      return ["summary", "strategy"] satisfies ExportSection[];
    case "FULL_REPORT":
    default:
      return ["summary", "positions", "transactions", "strategy", "cashFlow"] satisfies ExportSection[];
  }
}

export function getReportTypeOptions() {
  return [
    { value: "PORTFOLIO_SUMMARY", label: "Portfolio Summary" },
    { value: "TRADE_JOURNAL", label: "Trade Journal" },
    { value: "STRATEGY_PERFORMANCE", label: "Strategy Performance" },
    { value: "FULL_REPORT", label: "Full Report" },
  ] as const satisfies ReadonlyArray<{ value: ExportReportType; label: string }>;
}

export function getPeriodOptions() {
  return [
    { value: "TODAY", label: "Today" },
    { value: "THIS_WEEK", label: "This Week" },
    { value: "THIS_MONTH", label: "This Month" },
    { value: "YTD", label: "YTD" },
    { value: "CUSTOM", label: "Custom Range" },
  ] as const satisfies ReadonlyArray<{ value: ExportPeriod; label: string }>;
}

export function getFormatOptions() {
  return [
    { value: "PDF", label: "PDF" },
    { value: "EXCEL", label: "Excel (.xlsx)" },
  ] as const satisfies ReadonlyArray<{ value: ExportFormat; label: string }>;
}

export function getStrategyLabels() {
  return TRADE_STRATEGIES;
}
