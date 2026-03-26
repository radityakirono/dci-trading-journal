import { AppShellHeader } from "@/components/layout/app-shell-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metricDetails = [
  {
    title: "Portfolio Return",
    summary:
      "Shows how much total equity has changed versus starting capital over the selected period.",
    formula: "Portfolio Return = (Ending Equity - Starting Equity) / Starting Equity",
  },
  {
    title: "Win Rate",
    summary:
      "Measures the share of closed trades that were sold above their estimated average buy cost.",
    formula: "Win Rate = Winning Closed Trades / Total Closed Trades",
  },
  {
    title: "Max Drawdown",
    summary:
      "Tracks the deepest decline from the highest portfolio value to the next trough.",
    formula: "Max Drawdown = (Peak Equity - Trough Equity) / Peak Equity",
  },
  {
    title: "Sharpe Ratio",
    summary:
      "Compares average daily return with daily volatility to show return earned per unit of risk.",
    formula:
      "Sharpe Ratio = Mean Daily Return / Std. Dev. of Daily Return × sqrt(252)",
  },
  {
    title: "Alpha",
    summary:
      "Compares the portfolio's excess return against IHSG over the same evaluation period.",
    formula: "Alpha = Portfolio Return - IHSG Return",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        <AppShellHeader />

        <div className="grid gap-6">
          <Card id="overview" className="glass-card">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold">About DCI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                DCI, short for Dhoho Capital Investment, is a focused trading journal and
                decision-support terminal for Indonesian equities. The platform is designed
                to help a single portfolio team capture signals, record execution, and review
                portfolio behavior with less manual friction.
              </p>
              <p>
                The current product is centered on IDX stocks, cash discipline, and repeatable
                order review. Instead of acting like a generic brokerage clone, the journal is
                tuned for conviction-based workflows where a trade idea is evaluated against
                portfolio exposure, cash availability, and a documented strategy label.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  ["Overview", "#overview"],
                  ["Methodology", "#methodology"],
                  ["Risk", "#risk-disclosure"],
                  ["Metrics", "#metrics"],
                  ["Workflow", "#workflow"],
                  ["Contact", "#contact"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card id="methodology" className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Signal Methodology</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  Signals shown in the journal originate from the QuantLite Alpha pipeline and
                  are surfaced as BUY, SELL, HOLD, or ALERT states. In practice the pipeline
                  combines market regime context, conviction scoring, and risk-sized trade tickets
                  before anything is published into the journal.
                </p>
                <p>
                  Confidence percentages shown in the UI map from the engine&apos;s conviction
                  output. Higher values imply the engine sees stronger alignment across its
                  supporting metrics, macro and regime filters, and ticker-level setup quality.
                  Lower values remain informative, but they should be treated as weaker prompts
                  rather than automatic orders.
                </p>
                <p>
                  Operationally, every signal carries a lifecycle in the journal: Active, then
                  either Executed, Dismissed, or Expired. When a trade ticket includes an entry
                  zone, the notification layer can now raise an in-app alert once market price
                  reaches that level.
                </p>
              </CardContent>
            </Card>

            <Card id="risk-disclosure" className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Risk Disclosure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  Equity investing involves market risk, liquidity risk, and execution risk.
                  Losses can exceed expectations when volatility increases or when market depth
                  thins out around entry and exit levels.
                </p>
                <p>
                  Past performance does not guarantee future results. Signal output in DCI is
                  informational and workflow-oriented. It is meant to support disciplined review,
                  not replace judgment, mandate constraints, or independent risk controls.
                </p>
                <p>
                  Users should verify orders, position sizes, and cash balances before sending
                  capital into the market. Any exported or shared performance figures should be
                  interpreted with the sample size and methodology context shown in the journal.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card id="metrics" className="glass-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                Performance Metrics Explained
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible defaultValue="Portfolio Return">
                {metricDetails.map((metric) => (
                  <AccordionItem key={metric.title} value={metric.title}>
                    <AccordionTrigger>{metric.title}</AccordionTrigger>
                    <AccordionContent>
                      <p>{metric.summary}</p>
                      <div className="mt-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        Technical Details: {metric.formula}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card id="workflow" className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Execution Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  DCI is structured around a simple loop: review signals, check portfolio
                  context, place a trade with an explicit strategy tag, and let the journal
                  update portfolio and cash views immediately. This keeps the system honest
                  about both conviction and capital constraints.
                </p>
                <p>
                  Cash tracking is treated as a first-class input. Deposits, withdrawals,
                  dividends, gross order flows, and broker fees all contribute to the running
                  balance shown in the journal so that new orders are evaluated against real
                  spendable cash, not a rough estimate.
                </p>
              </CardContent>
            </Card>

            <Card id="contact" className="glass-card">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  For partnership questions, methodology review, or investor materials, the
                  current placeholder contact route is <strong>research@dci-invest.local</strong>.
                </p>
                <p>
                  This address can be replaced later with the production mailbox or contact
                  form once the external-facing workflow is finalized.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
