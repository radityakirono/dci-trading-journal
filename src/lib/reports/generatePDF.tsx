import { formatCurrency, formatPercent } from "@/lib/format";
import { getExportSections, type ReportData } from "@/lib/reports/data";
import {
  formatWinRateWithSample,
  SMALL_SAMPLE_WIN_RATE_NOTE,
} from "@/lib/win-rate";

function maybePercent(value: number | null) {
  return value == null ? "N/A" : formatPercent(value);
}

export async function generatePDF(reportData: ReportData) {
  const ReactPDF = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf } = ReactPDF;
  const sections = getExportSections(reportData.options.reportType);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 52,
      paddingHorizontal: 30,
      fontSize: 10,
      lineHeight: 1.45,
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    header: {
      marginBottom: 18,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
    },
    brand: {
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: 0.5,
    },
    subtitle: {
      marginTop: 3,
      color: "#475569",
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      marginBottom: 8,
      fontSize: 12,
      fontWeight: 700,
      color: "#0f172a",
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    summaryCard: {
      width: "48%",
      padding: 8,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 6,
      backgroundColor: "#f8fafc",
    },
    summaryLabel: {
      fontSize: 8,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    summaryValue: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: 700,
    },
    table: {
      borderWidth: 1,
      borderColor: "#dbe3ef",
      borderRadius: 6,
      overflow: "hidden",
    },
    tableHead: {
      flexDirection: "row",
      backgroundColor: "#e2e8f0",
      borderBottomWidth: 1,
      borderBottomColor: "#dbe3ef",
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#edf2f7",
    },
    tableCell: {
      paddingHorizontal: 6,
      paddingVertical: 5,
      fontSize: 9,
      flexGrow: 1,
    },
    headCell: {
      fontWeight: 700,
      color: "#0f172a",
    },
    note: {
      fontSize: 8,
      color: "#64748b",
    },
    footer: {
      position: "absolute",
      left: 30,
      right: 30,
      bottom: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: "#64748b",
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      paddingTop: 8,
    },
  });

  const summaryCards = [
    ["Portfolio Value", formatCurrency(reportData.summary.portfolioValue)],
    ["Total Return", maybePercent(reportData.summary.portfolioReturnPct)],
    [
      "Win Rate",
      formatWinRateWithSample({
        winRate: reportData.summary.winRate,
        closedTrades: reportData.summary.closedTrades,
        hasSmallSample: reportData.summary.winRateSmallSample,
      }),
    ],
    ["Max Drawdown", maybePercent(reportData.summary.maxDrawdown)],
    ["Alpha vs IHSG", maybePercent(reportData.summary.alphaVsIhsg)],
    ["Available Cash", formatCurrency(reportData.summary.availableCash)],
  ];

  const PdfDocument = (
    <Document
      title={`DCI ${reportData.reportTitle}`}
      author="DCI Trading Journal"
      subject={reportData.reportTitle}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>DCI Trading Journal</Text>
          <Text style={styles.subtitle}>{reportData.reportTitle}</Text>
          <Text style={styles.subtitle}>
            Period: {reportData.dateRange.label} ({reportData.dateRange.start} to {reportData.dateRange.end})
          </Text>
          <Text style={styles.subtitle}>Generated: {reportData.generatedAt}</Text>
        </View>

        {sections.includes("summary") ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <View style={styles.summaryGrid}>
              {summaryCards.map(([label, value]) => (
                <View key={label} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryValue}>{value}</Text>
                </View>
              ))}
            </View>
            {reportData.summary.winRateSmallSample ? (
              <Text style={[styles.note, { marginTop: 6 }]}>{SMALL_SAMPLE_WIN_RATE_NOTE}</Text>
            ) : null}
          </View>
        ) : null}

        {sections.includes("positions") ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Open Positions</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                {["Ticker", "Qty", "Avg Cost", "Last", "Value", "U/P&L", "Weight"].map((cell) => (
                  <Text key={cell} style={[styles.tableCell, styles.headCell]}>
                    {cell}
                  </Text>
                ))}
              </View>
              {reportData.positions.map((position) => (
                <View key={position.ticker} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{position.ticker}</Text>
                  <Text style={styles.tableCell}>{position.quantity}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(position.averageCost)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(position.marketPrice)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(position.marketValue)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(position.unrealizedPnL)}</Text>
                  <Text style={styles.tableCell}>{formatPercent(position.weight)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {sections.includes("transactions") ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                {["Date", "Ticker", "Side", "Qty", "Price", "Fee", "Cash Impact"].map((cell) => (
                  <Text key={cell} style={[styles.tableCell, styles.headCell]}>
                    {cell}
                  </Text>
                ))}
              </View>
              {reportData.transactions.map((transaction) => (
                <View key={transaction.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{transaction.date}</Text>
                  <Text style={styles.tableCell}>{transaction.ticker}</Text>
                  <Text style={styles.tableCell}>{transaction.side}</Text>
                  <Text style={styles.tableCell}>{transaction.quantity}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(transaction.price)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(transaction.fee)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(transaction.cashImpact)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {sections.includes("strategy") ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Strategy Performance</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                {["Period", "Return", "Win Rate", "Trades", "Sharpe"].map((cell) => (
                  <Text key={cell} style={[styles.tableCell, styles.headCell]}>
                    {cell}
                  </Text>
                ))}
              </View>
              {reportData.strategyPerformance.map((row) => (
                <View key={row.label} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{row.label}</Text>
                  <Text style={styles.tableCell}>{maybePercent(row.returnPct)}</Text>
                  <Text style={styles.tableCell}>
                    {row.closedTrades > 0
                      ? formatWinRateWithSample({
                          winRate: row.winRate,
                          closedTrades: row.closedTrades,
                          hasSmallSample: row.winRateSmallSample,
                        })
                      : "N/A"}
                  </Text>
                  <Text style={styles.tableCell}>{row.trades}</Text>
                  <Text style={styles.tableCell}>
                    {row.sharpe == null ? "N/A" : row.sharpe.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
            {reportData.strategyPerformance.some((row) => row.winRateSmallSample) ? (
              <Text style={[styles.note, { marginTop: 6 }]}>{SMALL_SAMPLE_WIN_RATE_NOTE}</Text>
            ) : null}
          </View>
        ) : null}

        {sections.includes("cashFlow") ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Cash Flow</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                {["Date", "Type", "Description", "Amount", "Balance"].map((cell) => (
                  <Text key={cell} style={[styles.tableCell, styles.headCell]}>
                    {cell}
                  </Text>
                ))}
              </View>
              {reportData.cashFlow.map((entry) => (
                <View key={entry.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{entry.date}</Text>
                  <Text style={styles.tableCell}>{entry.type}</Text>
                  <Text style={styles.tableCell}>{entry.description}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(entry.amount)}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(entry.runningBalance)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.note}>
          Confidential. Internal DCI working paper. Past performance does not guarantee future
          results.
        </Text>

        <View fixed style={styles.footer}>
          <Text>DCI Trading Journal Confidential</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  return pdf(PdfDocument).toBlob();
}
