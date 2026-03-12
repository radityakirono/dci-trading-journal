"use client";

import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SideToggle } from "@/components/dashboard/side-toggle";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  stockUniverse,
  groupBySector,
  type Stock,
} from "@/lib/stock-universe";
import type { TradeSide, TransactionInput } from "@/lib/types";

const SHARES_PER_LOT = 100;
const RECENT_KEY = "dci:recent-tickers";
const MAX_RECENT = 5;

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

function getRecentTickers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecentTicker(ticker: string) {
  const recent = getRecentTickers().filter((t) => t !== ticker);
  recent.unshift(ticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface TransactionFormProps {
  onCreate: (transaction: TransactionInput) => Promise<void>;
}

export function TransactionForm({ onCreate }: TransactionFormProps) {
  const [draft, setDraft] = useState<TransactionDraft>(defaultDraft);
  const [tickerQuery, setTickerQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredStocks = useMemo(() => {
    const keyword = tickerQuery.trim().toLowerCase();
    if (!keyword) {
      // Show recent tickers first, then first few from universe
      const recent = getRecentTickers();
      const recentStocks = recent
        .map((t) => stockUniverse.find((s) => s.ticker === t))
        .filter(Boolean) as Stock[];
      const others = stockUniverse
        .filter((s) => !recent.includes(s.ticker))
        .slice(0, 6);
      return { recent: recentStocks, results: others };
    }

    const results = stockUniverse
      .filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(keyword) ||
          stock.name.toLowerCase().includes(keyword)
      )
      .slice(0, 10);

    return { recent: [], results };
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
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

    setIsSubmitting(true);
    pushRecentTicker(ticker);

    try {
      await onCreate({
        date: draft.date,
        ticker,
        side: draft.side,
        quantity,
        price,
        note: draft.note.trim() || undefined,
      });

      setDraft((current) => ({
        ...defaultDraft,
        date: current.date,
        side: current.side,
      }));
      setTickerQuery("");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save transaction.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBuy = draft.side === "BUY";

  return (
    <Card
      className={cn(
        "h-full border-t-2 transition-colors",
        isBuy ? "border-t-emerald-500/50" : "border-t-red-500/50"
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Order Entry</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1">
        <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit}>
          {/* BUY / SELL Toggle */}
          <SideToggle
            value={draft.side}
            onChange={(side) => updateDraft("side", side)}
          />

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="trade-date" className="text-xs">Date</Label>
            <Input
              id="trade-date"
              type="date"
              value={draft.date}
              onChange={(event) => updateDraft("date", event.target.value)}
              required
            />
          </div>

          {/* Ticker */}
          <div className="space-y-1.5">
            <Label htmlFor="ticker" className="text-xs">Ticker</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ticker"
                value={tickerQuery}
                onChange={(event) => handleTickerChange(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search IDX80 ticker..."
                className="pl-8"
                required
              />
              {showSuggestions && (filteredStocks.recent.length > 0 || filteredStocks.results.length > 0) ? (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl backdrop-blur">
                  {filteredStocks.recent.length > 0 ? (
                    <>
                      <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Clock className="mr-1 inline size-3" />
                        Recent
                      </p>
                      {filteredStocks.recent.map((stock) => (
                        <button
                          key={`recent-${stock.ticker}`}
                          type="button"
                          className="flex w-full items-start justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectTicker(stock.ticker);
                          }}
                        >
                          <span className="text-[13px] font-medium">{stock.ticker}</span>
                          <span className="ml-3 text-[12px] text-muted-foreground">
                            {stock.name}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}
                  {filteredStocks.results.length > 0 ? (
                    <>
                      {filteredStocks.recent.length > 0 ? (
                        <div className="my-1 border-t border-border/60" />
                      ) : null}
                      {filteredStocks.results.map((stock) => (
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
                          <span className="ml-2 text-[12px] text-muted-foreground truncate">
                            {stock.name}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Quantity + Price */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs">Qty (lots)</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs">Price (IDR)</Label>
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

          {/* Broker Fee */}
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Broker Fee: </span>
            <span className="font-medium">{formatCurrency(brokerFee)}</span>
            <span className="text-muted-foreground"> ({isBuy ? "0.15%" : "0.25%"})</span>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="trade-note" className="text-xs">Note</Label>
            <Textarea
              id="trade-note"
              value={draft.note}
              onChange={(event) => updateDraft("note", event.target.value)}
              placeholder="Trade rationale (optional)"
              rows={3}
              className="min-h-20 resize-none"
            />
          </div>

          {error ? <p className="text-small text-destructive">{error}</p> : null}

          <Button
            type="submit"
            className={cn(
              "mt-auto w-full font-semibold transition-colors",
              isBuy
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-red-600 text-white hover:bg-red-700"
            )}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : isBuy
                ? "Place Buy Order"
                : "Place Sell Order"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
