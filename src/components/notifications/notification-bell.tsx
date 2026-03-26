"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock3,
  Loader2,
  Radar,
  ShieldAlert,
  ShoppingCart,
  Target,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  ApiError,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AppNotification, SignalNotification } from "@/lib/types";

interface NotificationBellProps {
  unreadCount?: number;
  recentSignals?: SignalNotification[];
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "NEW_SIGNAL":
      return { icon: Radar, tone: "text-emerald-400" };
    case "SIGNAL_EXECUTED":
      return { icon: BellRing, tone: "text-sky-400" };
    case "SIGNAL_EXPIRED":
      return { icon: Clock3, tone: "text-amber-400" };
    case "PRICE_TARGET":
      return { icon: Target, tone: "text-violet-400" };
    case "PORTFOLIO_ALERT":
      return { icon: ShieldAlert, tone: "text-rose-400" };
    case "ORDER_PLACED":
    default:
      return { icon: ShoppingCart, tone: "text-primary" };
  }
}

function notificationHref(type: AppNotification["type"]) {
  switch (type) {
    case "NEW_SIGNAL":
    case "SIGNAL_EXPIRED":
    case "PORTFOLIO_ALERT":
    case "PRICE_TARGET":
      return "/notifications";
    case "SIGNAL_EXECUTED":
    case "ORDER_PLACED":
    default:
      return "/";
  }
}

export function NotificationBell({
  unreadCount: initialUnreadCount = 0,
}: NotificationBellProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  async function loadNotifications() {
    try {
      setIsLoading(true);
      const payload = await fetchNotifications(20);
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error("Failed to load notifications:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleNotificationClick(notification: AppNotification) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
        showToast({
          tone: "error",
          title: "Notification update failed",
          description:
            error instanceof Error ? error.message : "Failed to mark notification as read.",
        });
      }
    }

    setOpen(false);
    router.push(notificationHref(notification.type));
  }

  async function handleMarkAllRead() {
    try {
      setIsMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      showToast({
        tone: "success",
        title: "Inbox updated",
        description: "All notifications have been marked as read.",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      showToast({
        tone: "error",
        title: "Notification update failed",
        description:
          error instanceof Error ? error.message : "Failed to mark all notifications as read.",
      });
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="View notifications"
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
        onClick={() => setOpen((current) => !current)}
      >
        <motion.div
          whileHover={{ rotate: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Bell className="size-4" />
        </motion.div>
        <AnimatePresence>
          {unreadCount > 0 ? (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-label="Notifications"
            tabIndex={-1}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleMarkAllRead()}
                disabled={isMarkingAll || unreadCount === 0}
              >
                {isMarkingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                Mark all
              </Button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {isLoading && latestNotifications.length === 0 ? (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : latestNotifications.length > 0 ? (
                latestNotifications.map((notification) => {
                  const { icon: Icon, tone } = notificationIcon(notification.type);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                        !notification.isRead && "bg-primary/5"
                      )}
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      <div className={cn("mt-0.5 rounded-full bg-muted/40 p-2", tone)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={cn(
                              "text-sm leading-5",
                              notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"
                            )}
                          >
                            {notification.message}
                          </p>
                          {!notification.isRead ? (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              )}
            </div>

            <div className="border-t border-border/60 p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  router.push("/notifications");
                }}
              >
                Open Signal Center
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
