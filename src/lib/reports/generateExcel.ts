import { formatCurrency, formatPercent } from "@/lib/format";
import { getExportSections, type ReportData } from "@/lib/reports/data";
import {
  formatWinRateWithSample,
  SMALL_SAMPLE_WIN_RATE_NOTE,
} from "@/lib/win-rate";
import type { Worksheet } from "exceljs";

function maybePercent(value: number | null) {
  return value == null ? "N/A" : formatPercent(value);
}

function styleHeaderRow(worksheet: Worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  } as const;
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: "thin" },
    };
  });
}

export async function generateExcel(reportData: ReportData) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sections = getExportSections(reportData.options.reportType);

  workbook.creator = "DCI Trading Journal";
  workbook.created = new Date(reportData.generatedAt);
  workbook.modified = new Date(reportData.generatedAt);
  workbook.subject = reportData.reportTitle;
  workbook.title = `DCI ${reportData.reportTitle}`;

  if (sections.includes("summary")) {
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 28 },
      { header: "Value", key: "value", width: 40 },
    ];

    summarySheet.addRows([
      { metric: "Report", value: reportData.reportTitle },
      { metric: "Period", value: reportData.dateRange.label },
      { metric: "Date Range", value: `${reportData.dateRange.start} to ${reportData.dateRange.end}` },
      { metric: "Generated At", value: reportData.generatedAt },
      { metric: "Portfolio Value", value: formatCurrency(reportData.summary.portfolioValue) },
      { metric: "Portfolio Return", value: maybePercent(reportData.summary.portfolioReturnPct) },
      {
        metric: "Win Rate",
        value: formatWinRateWithSample({
          winRate: reportData.summary.winRate,
          closedTrades: reportData.summary.closedTrades,
          hasSmallSample: reportData.summary.winRateSmallSample,
        }),
      },
      { metric: "Max Drawdown", value: maybePercent(reportData.summary.maxDrawdown) },
      { metric: "Alpha vs IHSG", value: maybePercent(reportData.summary.alphaVsIhsg) },
      { metric: "Available Cash", value: formatCurrency(reportData.summary.availableCash) },
      { metric: "Active Signals", value: reportData.summary.activeSignals },
      ...(reportData.summary.winRateSmallSample
        ? [{ metric: "Win Rate Note", value: SMALL_SAMPLE_WIN_RATE_NOTE }]
        : []),
    ]);

    styleHeaderRow(summarySheet);
  }

  if (sections.includes("positions")) {
    const positionsSheet = workbook.addWorksheet("Open Positions");
    positionsSheet.columns = [
      { header: "Ticker", key: "ticker", width: 12 },
      { header: "Qty (lots)", key: "quantity", width: 12 },
      { header: "Avg Cost", key: "averageCost", width: 14 },
      { header: "Last Price", key: "marketPrice", width: 14 },
      { header: "Day Change", key: "dayChange", width: 14 },
      { header: "Day Change %", key: "dayChangePct", width: 14 },
      { header: "Market Value", key: "marketValue", width: 16 },
      { header: "Cost Basis", key: "costBasis", width: 16 },
      { header: "Unrealized P/L", key: "unrealizedPnL", width: 16 },
      { header: "Unrealized P/L %", key: "unrealizedPnLPct", width: 16 },
      { header: "Weight %", key: "weight", width: 12 },
    ];
    positionsSheet.addRows(reportData.positions);
    styleHeaderRow(positionsSheet);
  }

  if (sections.includes("transactions")) {
    const transactionsSheet = workbook.addWorksheet("Transactions");
    transactionsSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Ticker", key: "ticker", width: 12 },
      { header: "Side", key: "side", width: 10 },
      { header: "Strategy", key: "strategy", width: 20 },
      { header: "Qty (lots)", key: "quantity", width: 12 },
      { header: "Price", key: "price", width: 14 },
      { header: "Fee", key: "fee", width: 14 },
      { header: "Cash Impact", key: "cashImpact", width: 16 },
      { header: "Note", key: "note", width: 36 },
    ];
    transactionsSheet.addRows(reportData.transactions);
    styleHeaderRow(transactionsSheet);
  }

  if (sections.includes("strategy")) {
    const strategySheet = workbook.addWorksheet("Strategy Performance");
    strategySheet.columns = [
      { header: "Period", key: "label", width: 14 },
      { header: "Return", key: "returnPct", width: 14 },
      { header: "Win Rate", key: "winRate", width: 14 },
      { header: "Trades", key: "trades", width: 12 },
      { header: "Closed Trades", key: "closedTrades", width: 14 },
      { header: "Sharpe", key: "sharpe", width: 12 },
    ];
    strategySheet.addRows(
      reportData.strategyPerformance.map((row) => ({
        ...row,
        winRate:
          row.closedTrades > 0
            ? formatWinRateWithSample({
                winRate: row.winRate,
                closedTrades: row.closedTrades,
                hasSmallSample: row.winRateSmallSample,
              })
            : "N/A",
      }))
    );
    styleHeaderRow(strategySheet);

    if (reportData.strategyPerformance.some((row) => row.winRateSmallSample)) {
      strategySheet.addRow({});
      strategySheet.addRow({
        label: "Note",
        winRate: SMALL_SAMPLE_WIN_RATE_NOTE,
      });
    }
  }

  if (sections.includes("cashFlow")) {
    const cashFlowSheet = workbook.addWorksheet("Cash Flow");
    cashFlowSheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 16 },
      { header: "Description", key: "description", width: 36 },
      { header: "Amount", key: "amount", width: 16 },
      { header: "Running Balance", key: "runningBalance", width: 18 },
      { header: "Source", key: "source", width: 12 },
      { header: "Note", key: "note", width: 24 },
    ];
    cashFlowSheet.addRows(reportData.cashFlow);
    styleHeaderRow(cashFlowSheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
