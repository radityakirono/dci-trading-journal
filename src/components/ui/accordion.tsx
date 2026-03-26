"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  openValues: string[];
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion.");
  }
  return context;
}

function useAccordionItemValue() {
  const value = React.useContext(AccordionItemContext);
  if (!value) {
    throw new Error("Accordion item components must be used within an AccordionItem.");
  }
  return value;
}

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  type?: AccordionType;
  defaultValue?: string | string[];
  collapsible?: boolean;
}

export function Accordion({
  children,
  className,
  type = "single",
  defaultValue,
  collapsible = true,
}: AccordionProps) {
  const [openValues, setOpenValues] = React.useState<string[]>(() => {
    if (Array.isArray(defaultValue)) return defaultValue;
    if (typeof defaultValue === "string" && defaultValue.length > 0) {
      return [defaultValue];
    }
    return [];
  });

  const toggle = React.useCallback(
    (value: string) => {
      setOpenValues((current) => {
        const isOpen = current.includes(value);

        if (type === "multiple") {
          if (isOpen) {
            return current.filter((item) => item !== value);
          }
          return [...current, value];
        }

        if (isOpen) {
          return collapsible ? [] : current;
        }

        return [value];
      });
    },
    [collapsible, type]
  );

  return (
    <AccordionContext.Provider value={{ openValues, toggle }}>
      <div className={cn("space-y-3", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  children: React.ReactNode;
  className?: string;
  value: string;
}

export function AccordionItem({ children, className, value }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cn("rounded-xl border border-border/60 bg-muted/15", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({
  children,
  className,
}: React.ComponentProps<"button">) {
  const { openValues, toggle } = useAccordionContext();
  const value = useAccordionItemValue();
  const isOpen = openValues.includes(value);
  const triggerId = `${value}-trigger`;
  const contentId = `${value}-content`;

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={contentId}
      onClick={() => toggle(value)}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-base font-semibold transition-colors hover:text-foreground",
        className
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

export function AccordionContent({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { openValues } = useAccordionContext();
  const value = useAccordionItemValue();
  const isOpen = openValues.includes(value);
  const triggerId = `${value}-trigger`;
  const contentId = `${value}-content`;

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!isOpen}
      className={cn("px-4 pb-4 text-sm leading-7 text-muted-foreground", !isOpen && "hidden", className)}
    >
      {children}
    </div>
  );
}
