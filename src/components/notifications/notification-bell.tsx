"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowUp, ArrowDown, Minus, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

interface NotificationBellProps {
  unreadCount: number;
  recentSignals: SignalNotification[];
}

const typeConfig: Record<
  string,
  { color: string; icon: React.ElementType }
> = {
  BUY: { color: "text-emerald-400 p-1 bg-emerald-500/10 rounded-md", icon: ArrowUp },
  SELL: { color: "text-red-400 p-1 bg-red-500/10 rounded-md", icon: ArrowDown },
  HOLD: { color: "text-amber-400 p-1 bg-amber-500/10 rounded-md", icon: Minus },
  ALERT: { color: "text-blue-400 p-1 bg-blue-500/10 rounded-md", icon: AlertTriangle },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1d" : `${days}d`;
}

export function NotificationBell({ unreadCount, recentSignals }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const previews = recentSignals.slice(0, 3);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
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
              className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <span className="text-sm font-semibold">Recent Signals</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
              )}
            </div>
            
            <div className="flex flex-col">
              {previews.length > 0 ? (
                previews.map((signal) => {
                  const cfg = typeConfig[signal.type] ?? typeConfig.ALERT;
                  const Icon = cfg.icon;
                  const isHighUrgency = (signal.confidence ?? 0) >= 0.8;

                  return (
                    <div
                      key={signal.id}
                      className={cn(
                        "flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 rounded-lg",
                        !signal.isRead && "bg-muted/20"
                      )}
                    >
                      <div className={cn("mt-1 shrink-0", cfg.color)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-semibold leading-none flex items-center gap-1.5">
                            {signal.ticker}
                            {isHighUrgency && (
                              <span className="flex size-1.5 rounded-full bg-red-500 animate-pulse" title="High Urgency" />
                            )}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(signal.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {signal.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No recent signals.
                </div>
              )}
            </div>
            
            <div className="p-1 mt-1 border-t border-border/40">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-full text-xs text-primary"
                )}
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
