"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Inbox,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Target,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { AnimatedSection } from "@/components/dashboard/animated-section";
import { AppShellHeader } from "@/components/layout/app-shell-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  ApiError,
  fetchNotifications,
  fetchTradingSignals,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api-client";
import { useRealtimeSignals } from "@/lib/hooks/useRealtimeSignals";
import { isSignalExpired } from "@/lib/signals";
import { cn } from "@/lib/utils";
import type { AppNotification, SignalType, TradingSignal } from "@/lib/types";

interface RealtimeQuantSignal {
  id: string;
  created_at: string;
  signal_ts: string;
  ticker: string;
  ticker_short: string;
  signal_type: SignalType;
  message: string;
  source: string;
  regime: string | null;
  conviction: number | null;
  trade_ticket: {
    target_entry?: number | null;
    size_lots?: number | null;
    risk_amount?: number | null;
  } | null;
}

interface SignalRun {
  run_id: string;
  slot_key: string;
  status: string;
  started_at: string;
  engine_version: string | null;
  error_message: string | null;
  metrics: {
    regime?: string;
    session?: string;
    execution_time_ms?: number;
    signals_generated?: number;
  } | null;
}

type SignalFilter = "ALL" | SignalType;
type NotificationFilter = "ALL" | "UNREAD";

const signalColors: Record<SignalType, { bg: string; text: string; border: string }> = {
  BUY: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  SELL: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
  HOLD: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  ALERT: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
};

function mapRealtimeSignal(signal: RealtimeQuantSignal): TradingSignal {
  return {
    id: signal.id,
    createdAt: signal.created_at,
    signalTs: signal.signal_ts,
    ticker: signal.ticker_short || signal.ticker,
    type: signal.signal_type,
    message: signal.message,
    source: signal.source,
    confidence: signal.conviction,
    status: isSignalExpired(signal.signal_ts) ? "EXPIRED" : "ACTIVE",
    actionDate: null,
    currentPrice: null,
    linkedTransactionId: null,
    regime: signal.regime,
    tradeTicket: signal.trade_ticket
      ? {
          targetEntry: signal.trade_ticket.target_entry ?? null,
          sizeLots: signal.trade_ticket.size_lots ?? null,
          riskAmount: signal.trade_ticket.risk_amount ?? null,
        }
      : null,
  };
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(ms?: number) {
  if (!ms) return "N/A";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function signalStatusLabel(status: TradingSignal["status"]) {
  if (status === "EXECUTED") return "Executed";
  if (status === "DISMISSED") return "Dismissed";
  if (status === "EXPIRED") return "Expired";
  return "Active";
}

function notificationVisual(type: AppNotification["type"]) {
  switch (type) {
    case "NEW_SIGNAL":
      return { icon: Radar, tone: "text-emerald-400", label: "New Signal", target: "trading-signals" };
    case "SIGNAL_EXECUTED":
      return { icon: BellRing, tone: "text-sky-400", label: "Executed", target: "trading-signals" };
    case "SIGNAL_EXPIRED":
      return { icon: Clock3, tone: "text-amber-400", label: "Expired", target: "trading-signals" };
    case "PRICE_TARGET":
      return { icon: Target, tone: "text-violet-400", label: "Price Target", target: null };
    case "PORTFOLIO_ALERT":
      return { icon: ShieldAlert, tone: "text-rose-400", label: "Alert", target: "trading-signals" };
    case "ORDER_PLACED":
    default:
      return { icon: ShoppingCart, tone: "text-primary", label: "Order", target: null };
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  suffix,
}: {
  icon: typeof Inbox;
  label: string;
  value: string | number;
  sub: string;
  suffix?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.15)" }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="rounded-xl border border-border/40 bg-card/60 p-4"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value : value}
        {suffix ? <span className="ml-1 text-lg font-medium">{suffix}</span> : null}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </motion.div>
  );
}

function RunRow({ run }: { run: SignalRun }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const tone =
    run.status === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-400"
      : run.status === "FAILED"
        ? "bg-red-500/15 text-red-400"
        : "bg-blue-500/15 text-blue-400";

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-card/80"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", tone)}>{run.status}</span>
          <span className="font-mono text-sm">{run.slot_key}</span>
          {run.error_message ? <span className="truncate text-xs text-muted-foreground">{run.error_message}</span> : null}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{formatDuration(run.metrics?.execution_time_ms)}</span>
          <span>{formatDateTime(run.started_at)}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }}><ChevronDown className="h-3.5 w-3.5" /></motion.div>
        </div>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 px-5 pb-3 sm:grid-cols-4">
              <div className="rounded-lg bg-background/50 px-3 py-2 text-xs"><span className="text-muted-foreground">Regime</span><p className="mt-0.5 font-medium">{run.metrics?.regime ?? "N/A"}</p></div>
              <div className="rounded-lg bg-background/50 px-3 py-2 text-xs"><span className="text-muted-foreground">Session</span><p className="mt-0.5 font-medium">{run.metrics?.session ?? "N/A"}</p></div>
              <div className="rounded-lg bg-background/50 px-3 py-2 text-xs"><span className="text-muted-foreground">Signals</span><p className="mt-0.5 font-medium">{run.metrics?.signals_generated ?? 0}</p></div>
              <div className="rounded-lg bg-background/50 px-3 py-2 text-xs"><span className="text-muted-foreground">Run ID</span><p className="mt-0.5 truncate font-mono font-medium">{run.run_id}</p></div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SignalCard({ signal }: { signal: TradingSignal }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const detailsId = useId();
  const colors = signalColors[signal.type];

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <motion.div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={detailsId}
        className="cursor-pointer px-5 py-4 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("rounded-md px-2.5 py-1 text-xs font-bold", colors.bg, colors.text)}>{signal.type}</span>
            <button
              type="button"
              className="group flex items-center gap-1.5"
              onClick={(event) => {
                event.stopPropagation();
                void navigator.clipboard.writeText(signal.ticker);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              <span className="text-lg font-semibold">{signal.ticker}</span>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />}
            </button>
            {signal.regime ? <span className="rounded-full border border-border/30 px-2 py-0.5 text-[11px] text-muted-foreground">{signal.regime}</span> : null}
            <span className="rounded-full border border-border/30 px-2 py-0.5 text-[11px] text-muted-foreground">{signalStatusLabel(signal.status)}</span>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              {signal.confidence != null ? <div className="text-sm font-semibold">{(signal.confidence * 100).toFixed(1)}%</div> : null}
              <div className="text-xs text-muted-foreground">{formatTime(signal.signalTs)}</div>
            </div>
            <motion.div animate={{ rotate: open ? 180 : 0 }}><ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /></motion.div>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{signal.message}</p>
      </motion.div>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={detailsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 px-5 pb-4 sm:grid-cols-2">
              <div className="rounded-lg bg-background/40 px-3 py-2 text-xs"><span className="text-muted-foreground">Source</span><p className="mt-0.5 font-medium">{signal.source ?? "Signal Engine"}</p></div>
              <div className="rounded-lg bg-background/40 px-3 py-2 text-xs"><span className="text-muted-foreground">Created</span><p className="mt-0.5 font-medium">{formatDateTime(signal.createdAt)}</p></div>
              {signal.tradeTicket?.targetEntry != null ? <div className="rounded-lg bg-background/40 px-3 py-2 text-xs"><span className="text-muted-foreground">Entry</span><p className="mt-0.5 font-medium">Rp{Number(signal.tradeTicket.targetEntry).toLocaleString("id-ID")}</p></div> : null}
              {signal.tradeTicket?.sizeLots != null ? <div className="rounded-lg bg-background/40 px-3 py-2 text-xs"><span className="text-muted-foreground">Size</span><p className="mt-0.5 font-medium">{signal.tradeTicket.sizeLots} lots</p></div> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ActivityItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => Promise<void>;
}) {
  const visual = notificationVisual(notification.type);
  const Icon = visual.icon;

  return (
    <button
      type="button"
      onClick={() => void onOpen(notification)}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/30",
        notification.isRead ? "border-border/50 bg-muted/10" : "border-primary/25 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 rounded-full bg-muted/40 p-2", visual.tone)}><Icon className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{visual.label}</span>
                {!notification.isRead ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Unread</span> : null}
              </div>
              <p className={cn("mt-1 text-sm leading-5", notification.isRead ? "text-muted-foreground" : "font-medium text-foreground")}>{notification.message}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [runs, setRuns] = useState<SignalRun[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ALL");
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("ALL");
  const { newSignals, isConnected } = useRealtimeSignals();

  const loadPage = useCallback(async () => {
    try {
      setRefreshing(true);
      const [signalRows, notificationPayload, runsRes] = await Promise.all([
        fetchTradingSignals(50),
        fetchNotifications(40),
        fetch("/api/signal-runs?limit=10", { cache: "no-store" }),
      ]);
      if (!runsRes.ok) throw new Error("Failed to fetch pipeline runs.");
      const runsPayload = (await runsRes.json()) as { runs?: SignalRun[] };
      setSignals(signalRows);
      setNotifications(notificationPayload.notifications);
      setUnreadCount(notificationPayload.unreadCount);
      setRuns(runsPayload.runs ?? []);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSignals([]);
        setNotifications([]);
        setUnreadCount(0);
        setRuns([]);
        setError(null);
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to fetch signal center.";
        setError(message);
        showToast({
          tone: "error",
          title: "Signal center unavailable",
          description: message,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const liveSignals = useMemo(
    () => newSignals.map((signal) => mapRealtimeSignal(signal as RealtimeQuantSignal)),
    [newSignals]
  );

  const allSignals = useMemo(() => {
    const map = new Map<string, TradingSignal>();
    for (const signal of [...liveSignals, ...signals]) {
      const prev = map.get(signal.id);
      if (!prev || new Date(signal.signalTs) > new Date(prev.signalTs)) map.set(signal.id, signal);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.signalTs).getTime() - new Date(a.signalTs).getTime()
    );
  }, [liveSignals, signals]);

  const visibleSignals = useMemo(
    () => (signalFilter === "ALL" ? allSignals : allSignals.filter((signal) => signal.type === signalFilter)),
    [allSignals, signalFilter]
  );

  const visibleNotifications = useMemo(
    () => (notificationFilter === "UNREAD" ? notifications.filter((item) => !item.isRead) : notifications),
    [notifications, notificationFilter]
  );

  const latestRun = runs[0];
  const activeSignals = allSignals.filter((signal) => signal.status === "ACTIVE").length;

  async function handleNotificationOpen(notification: AppNotification) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        showToast({
          tone: "error",
          title: "Notification update failed",
          description:
            err instanceof Error ? err.message : "Failed to mark notification as read.",
        });
      }
    }
    const target = notificationVisual(notification.type).target;
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleMarkAllRead() {
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      showToast({
        tone: "success",
        title: "Inbox updated",
        description: "All notifications have been marked as read.",
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      showToast({
        tone: "error",
        title: "Notification update failed",
        description:
          err instanceof Error ? err.message : "Failed to mark all notifications as read.",
      });
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background pb-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />
      <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        <AppShellHeader unreadCount={unreadCount} />

        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card/30 px-2.5 py-1">
            <motion.div
              className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50" : "bg-zinc-500")}
              animate={isConnected ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <span className="text-[11px] font-medium text-muted-foreground">{isConnected ? "Live" : "Offline"}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadPage()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        <AnimatedSection id="signal-header">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Signal Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">Inbox activity and QuantLite pipeline visibility in one place.</p>
          </div>
        </AnimatedSection>

        {error ? (
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
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-sm text-muted-foreground">Loading signal center...</span>
            </div>
          </div>
        ) : (
          <>
            <AnimatedSection id="signal-summary" className="mb-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Inbox} label="Unread Inbox" value={unreadCount} sub={`${notifications.length} total notifications`} />
                <StatCard icon={Radar} label="Active Signals" value={activeSignals} sub={`${allSignals.length} total signal records`} />
                <StatCard icon={BarChart3} label="Pipeline Runs" value={runs.length} sub={`${runs.filter((run) => run.status === "COMPLETED").length} completed`} />
                <StatCard icon={Zap} label="Latest Run" value={latestRun ? `${latestRun.slot_key.split(":")[1]}:00` : "---"} suffix={latestRun ? "WIB" : undefined} sub={latestRun ? `${latestRun.metrics?.regime ?? "Unknown"} · ${latestRun.engine_version ?? "n/a"}` : "No runs yet"} />
              </section>
            </AnimatedSection>

            <div className="grid gap-6 xl:grid-cols-12">
              <AnimatedSection id="activity-inbox" className="xl:col-span-4">
                <section className="rounded-xl border border-border/40 bg-card/60">
                  <div className="border-b border-border/30 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold">Activity Inbox</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Generated from quant signals and journal execution events.</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void handleMarkAllRead()} disabled={markingAll || unreadCount === 0}>
                        {markingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                        Mark all
                      </Button>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground sm:hidden">
                      Swipe to browse inbox filters.
                    </p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {(["ALL", "UNREAD"] as NotificationFilter[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setNotificationFilter(option)}
                          aria-pressed={notificationFilter === option}
                          className={cn("rounded-full px-3 py-1 text-xs font-medium", notificationFilter === option ? "bg-primary/15 text-primary" : "bg-muted/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground")}
                        >
                          {option === "ALL" ? "All Activity" : "Unread Only"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[58rem] space-y-3 overflow-y-auto p-4">
                    {visibleNotifications.length > 0 ? visibleNotifications.map((notification) => (
                      <ActivityItem key={notification.id} notification={notification} onOpen={handleNotificationOpen} />
                    )) : (
                      <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                        {notificationFilter === "UNREAD" ? "No unread notifications right now." : "No notifications recorded yet."}
                      </div>
                    )}
                  </div>
                </section>
              </AnimatedSection>

              <div className="space-y-6 xl:col-span-8">
                <AnimatedSection id="pipeline-runs">
                  <section className="rounded-xl border border-border/40 bg-card/60">
                    <div className="border-b border-border/30 px-5 py-3.5"><h2 className="text-base font-semibold">Recent Pipeline Runs</h2></div>
                    <div>{runs.length > 0 ? runs.map((run) => <RunRow key={run.run_id} run={run} />) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">No pipeline runs recorded yet.</p>}</div>
                  </section>
                </AnimatedSection>

                <AnimatedSection id="trading-signals">
                  <section className="rounded-xl border border-border/40 bg-card/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 px-5 py-3.5">
                      <h2 className="text-base font-semibold">Trading Signals {visibleSignals.length > 0 ? <span className="ml-2 text-sm font-normal text-muted-foreground">({visibleSignals.length})</span> : null}</h2>
                      <div className="w-full sm:hidden">
                        <p className="mb-2 text-xs text-muted-foreground">
                          Swipe to browse signal filters.
                        </p>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {(["ALL", "BUY", "SELL", "HOLD", "ALERT"] as SignalFilter[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSignalFilter(option)}
                            aria-pressed={signalFilter === option}
                            className={cn("rounded-md px-2.5 py-1 text-xs font-medium", signalFilter === option ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card/80 hover:text-foreground")}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      {visibleSignals.length > 0 ? visibleSignals.map((signal) => <SignalCard key={signal.id} signal={signal} />) : (
                        <div className="py-16 text-center">
                          <Zap className="mx-auto h-10 w-10 text-muted-foreground/30" />
                          <p className="mt-3 text-sm text-muted-foreground">{signalFilter === "ALL" ? "No trading signals generated yet." : `No ${signalFilter} signals found.`}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </AnimatedSection>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
