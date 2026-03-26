"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Info, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

import { AuthButton } from "@/components/auth/auth-button";
import { DciLogo } from "@/components/brand/dci-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignalNotification } from "@/lib/types";

const primaryLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notifications", label: "Notifications", icon: BellRing },
  { href: "/about", label: "About", icon: Info },
] as const;

interface AppShellHeaderProps {
  unreadCount?: number;
  recentSignals?: SignalNotification[];
  containerClassName?: string;
  actions?: () => ReactNode;
}

export function AppShellHeader({
  unreadCount = 0,
  recentSignals = [],
  containerClassName,
  actions,
}: AppShellHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 -mx-4 mb-6 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          className={cn(
            "glass-card glow-line flex items-center justify-between gap-3 rounded-2xl px-4 py-3",
            containerClassName
          )}
        >
          <div className="flex items-center gap-4">
            <DciLogo />
            <nav className="hidden items-center gap-1 md:flex">
              {primaryLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <NotificationBell unreadCount={unreadCount} recentSignals={recentSignals} />
              {actions?.()}
              <ThemeToggle />
              <AuthButton />
            </div>
            <div className="flex items-center gap-2 md:hidden">
              {actions?.()}
              <NotificationBell unreadCount={unreadCount} recentSignals={recentSignals} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <DciLogo />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="size-4" />
              </Button>
            </div>

            <nav className="mt-8 grid gap-2">
              {primaryLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "lg" }),
                      "justify-start"
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 rounded-2xl border border-border/60 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <AuthButton />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
