"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildCashLedger } from "@/lib/portfolio";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CashFlowEntry, CashFlowEntryInput, CashFlowType, Transaction } from "@/lib/types";

interface DepositWithdrawalJournalProps {
  entries: CashFlowEntry[];
  transactions: Transaction[];
  onCreate: (entry: CashFlowEntryInput) => Promise<void>;
  disabled?: boolean;
  readOnlyReason?: string;
}

export function DepositWithdrawalJournal({
  entries,
  transactions,
  onCreate,
  disabled = false,
  readOnlyReason = "Read-only access",
}: DepositWithdrawalJournalProps) {
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const composerId = useId();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<CashFlowType>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ledger = useMemo(() => buildCashLedger(entries, transactions), [entries, transactions]);

  const visibleLedger = useMemo(() => {
    const ordered = [...ledger];
    if (sortOrder === "newest") {
      ordered.reverse();
    }
    return ordered;
  }, [ledger, sortOrder]);

  const totalDeposited = entries
    .filter((entry) => entry.type === "DEPOSIT")
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const totalWithdrawn = entries
    .filter((entry) => entry.type === "WITHDRAWAL")
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const currentCashBalance = ledger[ledger.length - 1]?.runningBalance ?? 0;

  useEffect(() => {
    if (!isComposerOpen) return;

    const focusFrame = window.requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [isComposerOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || disabled) return;
    setError("");

    const numericAmount = Number(amount);

    if (!date || !Number.isFinite(numericAmount)) {
      setError("Please complete all required fields.");
      return;
    }

    if (type !== "ADJUSTMENT" && numericAmount <= 0) {
      setError("Deposits, withdrawals, and dividends must be greater than zero.");
      return;
    }

    if (type === "ADJUSTMENT" && numericAmount === 0) {
      setError("Adjustment amount cannot be zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        date,
        type,
        amount: numericAmount,
        note: note.trim() || undefined,
      });

      setAmount("");
      setNote("");
      setType("DEPOSIT");
      setDate(new Date().toISOString().slice(0, 10));
      setIsComposerOpen(false);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save journal entry.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle className="text-2xl font-semibold">Cash Flow</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full justify-center sm:w-auto"
              onClick={() =>
                setSortOrder((current) => (current === "newest" ? "oldest" : "newest"))
              }
            >
              <ArrowDownUp className="size-4" />
              {sortOrder === "newest" ? "Newest First" : "Oldest First"}
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full justify-center sm:w-auto"
              onClick={() => setIsComposerOpen((open) => !open)}
              disabled={disabled}
              title={disabled ? readOnlyReason : undefined}
              aria-expanded={isComposerOpen}
              aria-controls={composerId}
            >
              {isComposerOpen ? <X className="size-4" /> : <Plus className="size-4" />}
              {isComposerOpen ? "Close" : "Add Entry"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total Deposited
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-400">
              {formatCurrency(totalDeposited)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total Withdrawn
            </p>
            <p className="mt-2 text-lg font-semibold text-red-400">
              {formatCurrency(-totalWithdrawn)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Current Cash Balance
            </p>
            <p
              className={cn(
                "mt-2 text-lg font-semibold",
                currentCashBalance >= 0 ? "text-foreground" : "text-red-400"
              )}
            >
              {formatCurrency(currentCashBalance)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isComposerOpen ? (
          <form
            id={composerId}
            className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-4"
            onSubmit={handleSubmit}
          >
            <p className="text-xs text-muted-foreground">
              Add a manual cash movement such as a deposit, withdrawal, or dividend.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash-date">Date</Label>
                <Input
                  id="cash-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as CashFlowType)}
                  disabled={disabled}
                >
                  <SelectTrigger id="cash-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="DIVIDEND">Dividend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-amount">Amount (IDR)</Label>
              <Input
                id="cash-amount"
                ref={amountInputRef}
                type="number"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="25000000"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "cash-entry-error" : "cash-entry-help"}
                required
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-note">Note</Label>
              <Input
                id="cash-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional"
                aria-describedby="cash-entry-help"
                disabled={disabled}
              />
            </div>

            <p id="cash-entry-help" className="text-xs text-muted-foreground">
              Positive amounts are expected for deposits, withdrawals, and dividends.
            </p>
            {error ? (
              <p id="cash-entry-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {disabled ? (
              <p className="text-sm text-muted-foreground">{readOnlyReason}</p>
            ) : null}

            <Button
              type="submit"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Cash Entry"}
            </Button>
          </form>
        ) : null}

        <div className="hidden rounded-xl border border-border/60 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLedger.length > 0 ? (
                visibleLedger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatLongDate(entry.date)}</TableCell>
                    <TableCell>{entry.type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{entry.description}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        entry.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.runningBalance)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No cash flow activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {visibleLedger.length > 0 ? (
            visibleLedger.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{entry.type.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatLongDate(entry.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      entry.amount >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {formatCurrency(entry.amount)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{entry.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Running Balance</span>
                  <span>{formatCurrency(entry.runningBalance)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No cash flow activity yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
