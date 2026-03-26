"use client";

import { useState } from "react";
import { AlertTriangle, Landmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CashFlowEntryInput } from "@/lib/types";

interface InitialCapitalPromptProps {
  onCreate: (entry: CashFlowEntryInput) => Promise<void>;
  disabled?: boolean;
  readOnlyReason?: string;
}

export function InitialCapitalPrompt({
  onCreate,
  disabled = false,
  readOnlyReason = "Read-only access",
}: InitialCapitalPromptProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Opening capital");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || isSubmitting) return;

    setError("");
    const numericAmount = Number(amount);

    if (!date) {
      setError("Please choose the initial funding date.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Initial capital must be greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        date,
        type: "DEPOSIT",
        amount: numericAmount,
        note: note.trim() || "Opening capital",
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save opening capital."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Landmark className="size-5 text-amber-400" />
          Initial Capital Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p>
            Your account does not have an opening capital entry yet. Record the initial deposit
            first so portfolio return, cash availability, and drawdown statistics are grounded in
            real capital instead of a placeholder baseline.
          </p>
        </div>

        <form className="grid gap-4 lg:grid-cols-[1.1fr_1fr_auto]" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="initial-capital-date">Funding Date</Label>
              <Input
                id="initial-capital-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={disabled || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-capital-amount">Initial Capital (IDR)</Label>
              <Input
                id="initial-capital-amount"
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="250000000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={disabled || isSubmitting}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="initial-capital-note">Note</Label>
              <Input
                id="initial-capital-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opening capital"
                disabled={disabled || isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <Button type="submit" className="w-full" disabled={disabled || isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSubmitting ? "Saving..." : "Save Opening Capital"}
            </Button>
            {disabled ? (
              <p className="text-xs text-muted-foreground">{readOnlyReason}</p>
            ) : null}
          </div>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
