"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { DciLogo } from "@/components/brand/dci-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchSignalNotifications,
  getDefaultSignalNotifications,
} from "@/lib/signal-notifications";
import type { SignalNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotificationDayGroup {
  dayKey: string;
  dayLabel: string;
  items: SignalNotification[];
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<SignalNotification[]>(
    getDefaultSignalNotifications
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const groupedNotifications = useMemo<NotificationDayGroup[]>(() => {
    const groups = new Map<string, NotificationDayGroup>();
    const sorted = [...notifications].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    for (const item of sorted) {
      const dayKey = toLocalDayKey(new Date(item.createdAt));
      if (!groups.has(dayKey)) {
        groups.set(dayKey, {
          dayKey,
          dayLabel: formatDayLabel(dayKey),
          items: [],
        });
      }
      groups.get(dayKey)?.items.push(item);
    }

    return Array.from(groups.values()).sort((a, b) =>
      b.dayKey.localeCompare(a.dayKey)
    );
  }, [notifications]);

  const activeDayKey =
    selectedDayKey && groupedNotifications.some((group) => group.dayKey === selectedDayKey)
      ? selectedDayKey
      : groupedNotifications[0]?.dayKey;

  const activeGroup = groupedNotifications.find(
    (group) => group.dayKey === activeDayKey
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const latest = await fetchSignalNotifications();
      setNotifications(latest);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected fetch error";
      console.error("Failed to load signal notifications:", message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void loadNotifications();
    };

    const initialTimer = window.setTimeout(run, 0);
    const intervalTimer = window.setInterval(run, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, [loadNotifications]);

  return (
    <div className="relative min-h-screen bg-background pb-10">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_72%)]" />

      <main className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5"
              )}
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            <DciLogo />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Refresh notifications"
              onClick={() => void loadNotifications()}
            >
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base">Notification Days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {groupedNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications found.</p>
              ) : (
                groupedNotifications.map((group) => (
                  <button
                    key={group.dayKey}
                    type="button"
                    onClick={() => setSelectedDayKey(group.dayKey)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      activeDayKey === group.dayKey
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/70 bg-card/60 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{group.dayLabel}</p>
                      <Badge variant="outline">{group.items.length}</Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {activeGroup ? activeGroup.dayLabel : "Notifications"}
                </CardTitle>
                <Badge variant="outline">{unreadCount} unread</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {activeGroup ? (
                activeGroup.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-border/70 bg-card/70 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{item.ticker}</p>
                        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", signalTypeClass(item.type))}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{item.message}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{item.source ?? "Signal Engine"}</span>
                      <span>
                        {item.confidence != null
                          ? `Confidence ${(item.confidence * 100).toFixed(0)}%`
                          : "Confidence -"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a day to view notifications.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dayKey: string): string {
  const dayDate = new Date(`${dayKey}T00:00:00`);
  const today = toLocalDayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDayKey(yesterdayDate);

  if (dayKey === today) return "Today";
  if (dayKey === yesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dayDate);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function signalTypeClass(type: SignalNotification["type"]): string {
  if (type === "BUY") return "bg-primary/15 text-primary";
  if (type === "SELL") return "bg-destructive/15 text-destructive";
  if (type === "HOLD") return "bg-blue-500/15 text-blue-500";
  return "bg-amber-500/15 text-amber-500";
}
