"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { stockUniverse } from "@/lib/mock-data";
import type { TradeSide, Transaction } from "@/lib/types";

const SHARES_PER_LOT = 100;

type TransactionDraft = {
  date: string;
  ticker: string;
  side: TradeSide;
  quantity: string;
  price: string;
  note: string;
};

const defaultDraft: TransactionDraft = {
  date: new Date().toISOString().slice(0, 10),
  ticker: "",
  side: "BUY",
  quantity: "",
  price: "",
  note: "",
};

interface TransactionFormProps {
  onCreate: (transaction: Transaction) => void;
}

export function TransactionForm({ onCreate }: TransactionFormProps) {
  const [draft, setDraft] = useState<TransactionDraft>(defaultDraft);
  const [tickerQuery, setTickerQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string>("");

  const filteredStocks = useMemo(() => {
    const keyword = tickerQuery.trim().toLowerCase();
    if (!keyword) return stockUniverse.slice(0, 8);

    return stockUniverse
      .filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(keyword) ||
          stock.name.toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  }, [tickerQuery]);

  const brokerFee = useMemo(() => {
    const quantity = Number(draft.quantity);
    const price = Number(draft.price);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
    if (quantity <= 0 || price <= 0) return 0;

    const gross = quantity * SHARES_PER_LOT * price;
    const feeRate = draft.side === "BUY" ? 0.0015 : 0.0025;
    return Math.round(gross * feeRate);
  }, [draft.price, draft.quantity, draft.side]);

  function updateDraft<K extends keyof TransactionDraft>(
    key: K,
    value: TransactionDraft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectTicker(ticker: string) {
    updateDraft("ticker", ticker);
    setTickerQuery(ticker);
    setShowSuggestions(false);
  }

  function handleTickerChange(value: string) {
    setTickerQuery(value);
    setShowSuggestions(true);

    const normalized = value.trim().toUpperCase();
    const exact = stockUniverse.find((stock) => stock.ticker === normalized);
    updateDraft("ticker", exact ? exact.ticker : normalized);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const ticker = draft.ticker.trim().toUpperCase();
    const quantity = Number(draft.quantity);
    const price = Number(draft.price);

    const stock = stockUniverse.find((item) => item.ticker === ticker);
    if (!stock) {
      setError("Select a valid IDX ticker from search results.");
      return;
    }

    if (!draft.date || !Number.isFinite(quantity) || !Number.isFinite(price)) {
      setError("Please complete all required fields.");
      return;
    }

    if (quantity <= 0 || price <= 0) {
      setError("Quantity and price must be greater than zero.");
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      date: draft.date,
      ticker,
      side: draft.side,
      quantity,
      price,
      fee: brokerFee,
      note: draft.note.trim() || undefined,
    });

    setDraft((current) => ({
      ...defaultDraft,
      date: current.date,
      side: current.side,
    }));
    setTickerQuery("");
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1">
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade-date">Date</Label>
              <Input
                id="trade-date"
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-side">Side</Label>
              <Select
                value={draft.side}
                onValueChange={(value) => updateDraft("side", value as TradeSide)}
              >
                <SelectTrigger id="trade-side" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ticker"
                value={tickerQuery}
                onChange={(event) => handleTickerChange(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                placeholder="Search ticker or company name..."
                className="pl-8"
                required
              />
              {showSuggestions && filteredStocks.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
                  {filteredStocks.map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      className="flex w-full items-start justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectTicker(stock.ticker);
                      }}
                    >
                      <span className="text-[13px] font-medium">{stock.ticker}</span>
                      <span className="ml-3 text-[13px] text-muted-foreground">
                        {stock.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (lots)</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={draft.quantity}
                onChange={(event) => updateDraft("quantity", event.target.value)}
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (IDR)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={draft.price}
                onChange={(event) => updateDraft("price", event.target.value)}
                placeholder="9300"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker-fee">Broker Fee (Auto)</Label>
            <Input id="broker-fee" value={formatCurrency(brokerFee)} readOnly />
            <p className="text-small text-muted-foreground">
              Buy: 0.15% | Sell: 0.25%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade-note">Note</Label>
            <Textarea
              id="trade-note"
              value={draft.note}
              onChange={(event) => updateDraft("note", event.target.value)}
              placeholder="Optional"
              rows={8}
              className="min-h-40 resize-none overflow-y-auto"
            />
          </div>

          {error ? <p className="text-small text-destructive">{error}</p> : null}

          <Button type="submit" className="mt-auto w-full">
            Save Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
