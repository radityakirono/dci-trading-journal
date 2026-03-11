'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Radio, RefreshCw, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { DciLogo } from '@/components/brand/dci-logo';
import { AnimatedSection } from '@/components/dashboard/animated-section';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRealtimeSignals } from '@/lib/hooks/useRealtimeSignals';

/* --- Types --- */

interface TradeTicket {
  target_entry?: number;
  size_lots?: number;
  risk_amount?: number;
}

interface QuantSignal {
  id: string;
  signal_ts: string;
  ticker: string;
  ticker_short: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'ALERT';
  raw_action: string;
  message: string;
  regime: string | null;
  conviction: number | null;
  supporting_metrics: Record<string, unknown>;
  trade_ticket: TradeTicket | null;
  delivery_status: string;
  read_at: string | null;
}

interface SignalRun {
  run_id: string;
  slot_key: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  engine_version: string | null;
  error_message: string | null;
  metrics: {
    regime?: string;
    session?: string;
    buy_signals?: number;
    sell_signals?: number;
    execution_time_ms?: number;
    signals_generated?: number;
    [key: string]: unknown;
  } | null;
}

/* --- Badge Colors --- */

const SIGNAL_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  BUY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  SELL: { bg: 'bg-red-500/15', text: 'text-red-400', glow: 'shadow-red-500/20' },
  HOLD: { bg: 'bg-amber-500/15', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  ALERT: { bg: 'bg-blue-500/15', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
};

const RUN_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  RUNNING: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  FAILED: { bg: 'bg-red-500/15', text: 'text-red-400' },
  SKIPPED: { bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
  PARTIAL: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
};

/* --- Helpers --- */

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* --- Page --- */

export default function NotificationsPage() {
  const [signals, setSignals] = useState<QuantSignal[]>([]);
  const [runs, setRuns] = useState<SignalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { newSignals, isConnected } = useRealtimeSignals();

  const fetchSignals = useCallback(async () => {
    try {
      setRefreshing(true);
      const [signalsRes, runsRes] = await Promise.all([
        fetch('/api/signals?limit=50'),
        fetch('/api/signal-runs?limit=10'),
      ]);

      if (!signalsRes.ok || !runsRes.ok) {
        throw new Error('Failed to fetch signal data');
      }

      const signalsData = await signalsRes.json();
      const runsData = await runsRes.json();

      setSignals(signalsData.signals || []);
      setRuns(runsData.runs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const allSignals = [
    ...newSignals.filter((ns) => !signals.some((s) => s.id === ns.id)),
    ...signals,
  ];

  const latestRun = runs[0];
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === 'COMPLETED').length;
  const skippedRuns = runs.filter((r) => r.status === 'SKIPPED').length;

  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <DciLogo />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card/30 px-2.5 py-1">
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50'
                    : 'bg-zinc-500'
                }`}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <button
              onClick={fetchSignals}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <ThemeToggle />
          </div>
        </div>

        <AnimatedSection id="signal-header">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Signal Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Automated trading signals from the QuantLite Alpha engine
            </p>
          </div>
        </AnimatedSection>

        {error != null ? (
          <AnimatedSection id="error">
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          </AnimatedSection>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-sm text-muted-foreground">Loading signals...</span>
            </div>
          </div>
        ) : (
          <>
            <AnimatedSection id="pipeline-summary">
              <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Pipeline Runs
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{totalRuns}</p>
                  <p className="text-xs text-muted-foreground">
                    {completedRuns} completed &middot; {skippedRuns} skipped
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    Latest Run
                  </div>
                  {latestRun != null ? (
                    <>
                      <p className="mt-1 text-2xl font-bold tabular-nums">
                        {latestRun.slot_key.split(':')[1]}:00 WIB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {latestRun.metrics?.regime ?? 'Unknown'} regime &middot; {latestRun.engine_version}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-lg text-muted-foreground">No runs yet</p>
                  )}
                </div>
                <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Radio className="h-4 w-4" />
                    Signals Generated
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{allSignals.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Across {totalRuns} pipeline executions
                  </p>
                </div>
              </section>
            </AnimatedSection>

            <AnimatedSection id="pipeline-runs">
              <section className="mb-6 rounded-xl border border-border/40 bg-card/60">
                <div className="border-b border-border/30 px-5 py-3.5">
                  <h2 className="text-base font-semibold">Recent Pipeline Runs</h2>
                </div>
                <div className="divide-y divide-border/20">
                  {runs.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No pipeline runs recorded yet.
                    </p>
                  ) : (
                    runs.map((run) => {
                      const statusStyle = RUN_STATUS_COLORS[run.status] ?? {
                        bg: 'bg-zinc-500/15',
                        text: 'text-zinc-400',
                      };
                      return (
                        <div
                          key={run.run_id}
                          className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-card/80"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {run.status}
                            </span>
                            <span className="font-mono text-sm tabular-nums">{run.slot_key}</span>
                            {run.error_message != null ? (
                              <span className="truncate text-xs text-muted-foreground max-w-[200px]">
                                {run.error_message}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                            {run.metrics?.execution_time_ms != null ? (
                              <span className="tabular-nums">
                                {formatDuration(run.metrics.execution_time_ms as number)}
                              </span>
                            ) : null}
                            <span className="tabular-nums">{formatDateTime(run.started_at)}</span>
                            {run.engine_version != null ? (
                              <span className="opacity-60">{run.engine_version}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </AnimatedSection>

            <AnimatedSection id="trading-signals">
              <section className="rounded-xl border border-border/40 bg-card/60">
                <div className="border-b border-border/30 px-5 py-3.5 flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    Trading Signals
                    {allSignals.length > 0 ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({allSignals.length})
                      </span>
                    ) : null}
                  </h2>
                </div>

                {allSignals.length === 0 ? (
                  <div className="py-16 text-center">
                    <Zap className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No trading signals generated yet.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Signals will appear here automatically when the engine generates them.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {allSignals.map((signal) => {
                      const colors = SIGNAL_COLORS[signal.signal_type] ?? {
                        bg: 'bg-zinc-500/15',
                        text: 'text-zinc-400',
                        glow: '',
                      };
                      return (
                        <div
                          key={signal.id}
                          className="px-5 py-4 transition-colors hover:bg-card/80"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold shadow-sm ${colors.bg} ${colors.text} ${colors.glow}`}
                              >
                                {signal.signal_type}
                              </span>
                              <span className="text-lg font-semibold tracking-tight">
                                {signal.ticker_short}
                              </span>
                              {signal.regime != null ? (
                                <span className="rounded-full border border-border/30 bg-card/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                  {signal.regime}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-right shrink-0">
                              {signal.conviction !== null ? (
                                <div className="text-sm font-semibold tabular-nums">
                                  {(signal.conviction * 100).toFixed(1)}%
                                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    conviction
                                  </span>
                                </div>
                              ) : null}
                              <div className="text-xs text-muted-foreground tabular-nums">
                                {formatTime(signal.signal_ts)}
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {signal.message}
                          </p>
                          {signal.trade_ticket &&
                          Object.keys(signal.trade_ticket).length > 0 ? (
                            <div className="mt-3 flex gap-4 rounded-lg border border-border/20 bg-background/50 px-3 py-2 text-xs font-mono tabular-nums">
                              {signal.trade_ticket.target_entry != null ? (
                                <span>
                                  <span className="text-muted-foreground">Entry</span>{' '}
                                  <span className="font-medium">
                                    Rp{Number(signal.trade_ticket.target_entry).toLocaleString('id-ID')}
                                  </span>
                                </span>
                              ) : null}
                              {signal.trade_ticket.size_lots != null ? (
                                <span>
                                  <span className="text-muted-foreground">Size</span>{' '}
                                  <span className="font-medium">
                                    {String(signal.trade_ticket.size_lots)} lots
                                  </span>
                                </span>
                              ) : null}
                              {signal.trade_ticket.risk_amount != null ? (
                                <span>
                                  <span className="text-muted-foreground">Risk</span>{' '}
                                  <span className="font-medium">
                                    Rp{Number(signal.trade_ticket.risk_amount).toLocaleString('id-ID')}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </AnimatedSection>
          </>
        )}
      </main>
    </div>
  );
}
