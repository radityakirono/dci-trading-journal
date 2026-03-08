"use client";

import { Bell, Search } from "lucide-react";

import { DciLogo } from "@/components/brand/dci-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

interface TopNavbarProps {
  links: Array<{ href: string; label: string }>;
}

export function TopNavbar({ links }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <DciLogo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 w-48 pl-8 text-[13px]"
              placeholder="Cari ticker IDX..."
            />
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
