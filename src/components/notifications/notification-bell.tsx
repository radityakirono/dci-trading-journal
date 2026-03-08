"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { SignalNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  notifications: SignalNotification[];
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <Link
      href="/notifications"
      aria-label="Open notifications page"
      className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
