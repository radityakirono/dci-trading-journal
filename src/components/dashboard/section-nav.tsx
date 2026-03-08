"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  items: SectionItem[];
  className?: string;
}

export function SectionNav({ items, className }: SectionNavProps) {
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
          rootMargin: "-35% 0px -50% 0px",
          threshold: [0.2, 0.45, 0.65],
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
    <div className={cn("sticky top-3 z-30", className)}>
      <div className="rounded-2xl border border-border/60 bg-background/80 p-2 shadow-[0_12px_50px_-28px_color-mix(in_oklch,var(--foreground)_22%,transparent)] backdrop-blur">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <span className="flex items-center gap-1 rounded-xl border border-border/70 px-3 py-1.5 text-[13px] text-muted-foreground">
            <LayoutGrid className="size-3.5" />
            Navigator
          </span>
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "relative rounded-xl px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-foreground"
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-section-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-muted"
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  />
                ) : null}
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
