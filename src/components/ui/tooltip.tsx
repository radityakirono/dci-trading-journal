"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom";
}

export function Tooltip({
  content,
  children,
  className,
  contentClassName,
  side = "top",
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const tooltipId = React.useId();
  const childElement =
    React.isValidElement<{ "aria-describedby"?: string }>(children) &&
    typeof children.type !== "symbol"
      ? children
      : null;
  const describedBy = childElement
    ? [childElement.props["aria-describedby"], open ? tooltipId : null]
        .filter(Boolean)
        .join(" ") || undefined
    : undefined;

  const trigger = childElement
    ? React.cloneElement(childElement, {
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
    >
      {trigger}
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          aria-hidden={!open}
          className={cn(
            "absolute z-50 w-64 rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-left text-xs leading-5 text-card-foreground shadow-xl backdrop-blur",
            side === "top"
              ? "bottom-[calc(100%+0.625rem)] left-1/2 -translate-x-1/2"
              : "top-[calc(100%+0.625rem)] left-1/2 -translate-x-1/2",
            contentClassName
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

interface InfoTooltipProps {
  content: React.ReactNode;
  label?: string;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom";
}

export function InfoTooltip({
  content,
  label = "Show more information",
  className,
  contentClassName,
  side = "top",
}: InfoTooltipProps) {
  return (
    <Tooltip
      content={content}
      contentClassName={contentClassName}
      side={side}
      className="align-middle"
    >
      <button
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className
        )}
      >
        <Info className="size-3" />
      </button>
    </Tooltip>
  );
}
