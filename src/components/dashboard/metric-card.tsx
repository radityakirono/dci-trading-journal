"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function MetricCard({
  title,
  value,
  delta,
  tone,
  icon: Icon,
}: MetricCardProps) {
  const deltaToneClass =
    tone === "positive"
      ? "text-emerald-500"
      : tone === "negative"
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden border-border/80 transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardDescription>{title}</CardDescription>
            <span className="rounded-xl border border-border/70 bg-muted/70 p-1.5 text-muted-foreground">
              <Icon className="size-4" />
            </span>
          </div>
          <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        </CardHeader>
        <CardContent className={cn("text-small", deltaToneClass)}>{delta}</CardContent>
      </Card>
    </motion.div>
  );
}
