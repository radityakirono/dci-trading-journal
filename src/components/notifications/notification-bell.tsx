"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

interface NotificationBellProps {
  unreadCount: number;
  recentSignals: SignalNotification[];
}

export function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Link
      href="/notifications"
      aria-label="View notifications"
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
    </Link>
  );
}
