"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency, formatLongDate } from "@/lib/format";
import type { CashFlowEntry, CashFlowType } from "@/lib/types";

interface DepositWithdrawalJournalProps {
  entries: CashFlowEntry[];
  onCreate: (entry: CashFlowEntry) => void;
}

export function DepositWithdrawalJournal({
  entries,
  onCreate,
}: DepositWithdrawalJournalProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<CashFlowType>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  const netCashFlow = entries.reduce((sum, entry) => {
    if (entry.type === "DEPOSIT") return sum + entry.amount;
    if (entry.type === "WITHDRAWAL") return sum - entry.amount;
    return sum + entry.amount;
  }, 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!date || !Number.isFinite(numericAmount)) {
      return;
    }

    if (type !== "ADJUSTMENT" && numericAmount <= 0) {
      return;
    }

    if (type === "ADJUSTMENT" && numericAmount === 0) {
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      date,
      type,
      amount: numericAmount,
      note: note.trim() || undefined,
    });

    setAmount("");
    setNote("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold">Equity Journal</CardTitle>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Toggle journal form"
            onClick={() => setIsComposerOpen((open) => !open)}
          >
            {isComposerOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-small">
          <p className="text-muted-foreground">Net Cash Flow</p>
          <p className={netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"}>
            {formatCurrency(netCashFlow)}
          </p>
        </div>

        {isComposerOpen ? (
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash-date">Date</Label>
                <Input
                  id="cash-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-type">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as CashFlowType)}>
                  <SelectTrigger id="cash-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-amount">Amount (IDR)</Label>
              <Input
                id="cash-amount"
                type="number"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="25000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-note">Note</Label>
              <Input
                id="cash-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional"
              />
            </div>

            <Button type="submit" variant="secondary">
              Save Journal Entry
            </Button>
          </form>
        ) : null}

        <div className="max-h-[260px] overflow-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.length > 0 ? (
                sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatLongDate(entry.date)}</TableCell>
                    <TableCell>
                      {entry.type === "DEPOSIT"
                        ? "Deposit"
                        : entry.type === "WITHDRAWAL"
                          ? "Withdrawal"
                          : "Adjustment"}
                    </TableCell>
                    <TableCell
                      className={entry.amount >= 0 ? "text-emerald-500" : "text-red-500"}
                    >
                      {formatCurrency(
                        entry.type === "WITHDRAWAL" ? -entry.amount : entry.amount
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No journal entries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
