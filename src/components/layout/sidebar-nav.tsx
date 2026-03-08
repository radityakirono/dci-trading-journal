"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarNavProps {
  items: SidebarItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;

    const observers: IntersectionObserver[] = [];
    const nodes = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    nodes.forEach((node) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        {
          rootMargin: "-32% 0px -52% 0px",
          threshold: [0.3, 0.55],
        }
      );

      observer.observe(node);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [items]);

  return (
    <aside className="hidden xl:block xl:w-56">
      <div className="sticky top-24 rounded-2xl border border-border/70 bg-card/80 p-3">
        <p className="px-2 pb-2 text-[13px] font-medium text-muted-foreground">
          Navigasi
        </p>
        <nav className="grid gap-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-foreground"
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-muted"
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  />
                ) : null}
                <Icon className="size-4" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
