"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { TradeSide } from "@/lib/types";

interface SideToggleProps {
  value: TradeSide;
  onChange: (side: TradeSide) => void;
}

export function SideToggle({ value, onChange }: SideToggleProps) {
  return (
    <div
      className="relative flex rounded-lg bg-muted p-1"
      role="radiogroup"
      aria-label="Trade side"
    >
      <motion.div
        layout
        layoutId="side-indicator"
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-md",
          value === "BUY"
            ? "left-1 bg-emerald-500/20 ring-1 ring-emerald-500/40"
            : "right-1 bg-red-500/20 ring-1 ring-red-500/40"
        )}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      />
      <button
        type="button"
        onClick={() => onChange("BUY")}
        role="radio"
        aria-checked={value === "BUY"}
        className={cn(
          "relative z-10 flex-1 rounded-md py-2 text-center text-sm font-semibold transition-colors",
          value === "BUY" ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
        )}
      >
        BUY
      </button>
      <button
        type="button"
        onClick={() => onChange("SELL")}
        role="radio"
        aria-checked={value === "SELL"}
        className={cn(
          "relative z-10 flex-1 rounded-md py-2 text-center text-sm font-semibold transition-colors",
          value === "SELL" ? "text-red-400" : "text-muted-foreground hover:text-foreground"
        )}
      >
        SELL
      </button>
    </div>
  );
}
