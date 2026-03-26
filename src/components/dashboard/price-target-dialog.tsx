"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import type { PriceTargetWatch } from "@/lib/types";

interface PriceTargetDialogProps {
  open: boolean;
  ticker: string | null;
  currentPrice: number | null;
  existingTarget?: PriceTargetWatch | null;
  isSaving?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { ticker: string; targetPrice: number; currentPrice: number | null }) => Promise<void>;
  onClear?: (ticker: string) => Promise<void>;
}

export function PriceTargetDialog({
  open,
  ticker,
  currentPrice,
  existingTarget = null,
  isSaving = false,
  error = "",
  onOpenChange,
  onSave,
  onClear,
}: PriceTargetDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [targetPrice, setTargetPrice] = useState(
    existingTarget?.targetPrice != null ? String(Math.round(existingTarget.targetPrice)) : ""
  );

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onOpenChange, open]);

  if (!open || !ticker) return null;

  const inferredDirection =
    currentPrice != null && Number.isFinite(currentPrice)
      ? Number(targetPrice || existingTarget?.targetPrice || 0) >= currentPrice
        ? "Trigger above current price"
        : "Trigger below current price"
      : "Target direction will be inferred automatically";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="flex h-full w-full items-stretch justify-center sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="price-target-title"
          className="flex h-full w-full flex-col border border-border/70 bg-card p-5 shadow-2xl sm:h-auto sm:max-w-md sm:rounded-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Price Target
              </p>
              <h3 id="price-target-title" className="mt-1 text-xl font-semibold">
                {ticker}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an in-app alert when market price reaches your target level.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close price target dialog"
              disabled={isSaving}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-medium">
                  {currentPrice != null ? formatCurrency(currentPrice) : "Unavailable"}
                </span>
              </div>
              {existingTarget ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Current Target</span>
                  <span className="font-medium">{formatCurrency(existingTarget.targetPrice)}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-target-input">Target Price (IDR)</Label>
              <Input
                id="price-target-input"
                ref={inputRef}
                type="number"
                min="1"
                step="1"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder="6000"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "price-target-error" : "price-target-help"}
                disabled={isSaving}
              />
              <p id="price-target-help" className="text-xs text-muted-foreground">
                {inferredDirection}
              </p>
              {error ? (
                <p id="price-target-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-auto grid gap-3 pt-5">
            {existingTarget && onClear ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onClear(ticker)}
                disabled={isSaving}
              >
                Clear Target
              </Button>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void onSave({
                    ticker,
                    targetPrice: Number(targetPrice),
                    currentPrice,
                  })
                }
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : existingTarget ? (
                  "Update Target"
                ) : (
                  "Save Target"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
