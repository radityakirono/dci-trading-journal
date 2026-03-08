"use client";

import { cn } from "@/lib/utils";

interface DciLogoProps {
  className?: string;
  withWordmark?: boolean;
}

export function DciLogo({ className, withWordmark = true }: DciLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card/80">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 17L8.2 12.2L12.2 14.6L20.5 6.5"
            stroke="#22C55E"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 6.5H15.8"
            stroke="#22C55E"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {withWordmark ? (
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight">DCI</p>
          <p className="text-small text-muted-foreground">Dhoho Capital Investment</p>
        </div>
      ) : null}
    </div>
  );
}
