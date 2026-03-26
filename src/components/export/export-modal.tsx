"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  getFormatOptions,
  getPeriodOptions,
  getReportTypeOptions,
  type ExportOptions,
} from "@/lib/reports/data";
import { cn } from "@/lib/utils";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: ExportOptions) => Promise<unknown>;
  isExporting?: boolean;
  error?: string;
}

interface OptionGroupProps {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
}).format(new Date());

function OptionGroup({ label, value, options, onChange }: OptionGroupProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={cn(
              "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
              value === option.value
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/60 bg-muted/15 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ExportModal({
  open,
  onOpenChange,
  onGenerate,
  isExporting = false,
  error = "",
}: ExportModalProps) {
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [reportType, setReportType] = useState<ExportOptions["reportType"]>("PORTFOLIO_SUMMARY");
  const [period, setPeriod] = useState<ExportOptions["period"]>("YTD");
  const [format, setFormat] = useState<ExportOptions["format"]>("PDF");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [localError, setLocalError] = useState("");

  const isCustomRange = period === "CUSTOM";
  const mergedError = error || localError;
  const modalDescription = useMemo(
    () =>
      reportType === "FULL_REPORT"
        ? "Generate a consolidated investor-ready report."
        : "Generate a focused export from the current dashboard data.",
    [reportType]
  );

  useEffect(() => {
    if (!open) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isExporting) {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExporting, onOpenChange, open]);

  if (!open) return null;

  async function handleGenerate() {
    setLocalError("");

    if (isCustomRange && (!startDate || !endDate)) {
      setLocalError("Please choose both start and end dates for a custom range.");
      showToast({
        tone: "error",
        title: "Custom range incomplete",
        description: "Please choose both start and end dates before generating the report.",
      });
      return;
    }

    try {
      await onGenerate({
        reportType,
        period,
        format,
        startDate: isCustomRange ? startDate : undefined,
        endDate: isCustomRange ? endDate : undefined,
      });
      onOpenChange(false);
    } catch {
      // Error state is surfaced by the hook.
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm">
      <div className="flex h-full w-full items-stretch justify-center sm:items-center sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className="flex h-full w-full flex-col border border-border/70 bg-card p-5 shadow-2xl sm:h-auto sm:max-w-2xl sm:rounded-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Export Report
              </p>
              <h2 id={titleId} className="mt-1 text-2xl font-semibold">
                Generate Portfolio Report
              </h2>
              <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
                {modalDescription}
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close export modal"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-5 overflow-y-auto pr-1">
            <OptionGroup
              label="Report Type"
              value={reportType}
              options={getReportTypeOptions()}
              onChange={(value) => setReportType(value as ExportOptions["reportType"])}
            />

            <OptionGroup
              label="Time Period"
              value={period}
              options={getPeriodOptions()}
              onChange={(value) => setPeriod(value as ExportOptions["period"])}
            />

            {isCustomRange ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-start">Start Date</Label>
                  <Input
                    id="export-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-end">End Date</Label>
                  <Input
                    id="export-end"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Custom exports include activity between the selected start and end dates.
                </p>
              </div>
            ) : null}

            <OptionGroup
              label="Format"
              value={format}
              options={getFormatOptions()}
              onChange={(value) => setFormat(value as ExportOptions["format"])}
            />

            {mergedError ? (
              <p className="text-sm text-destructive" role="alert">
                {mergedError}
              </p>
            ) : null}
          </div>

          <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleGenerate()} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
