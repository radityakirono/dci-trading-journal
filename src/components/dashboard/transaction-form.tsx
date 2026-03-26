"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SideToggle } from "@/components/dashboard/side-toggle";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getHeldLotsByTicker, getTotalShares } from "@/lib/portfolio";
import {
  getStockByTicker,
  stockUniverseAlphabetical,
  type Stock,
} from "@/lib/stock-universe";
import {
  calculateBrokerFee,
  calculateGrossTradeValue,
  calculateNetTradeValue,
  TRADE_STRATEGIES,
} from "@/lib/trading";
import { cn } from "@/lib/utils";
import type {
  TradeSide,
  TradeStrategy,
  Transaction,
  TransactionInput,
  SignalExecutionPrefill,
} from "@/lib/types";

const RECENT_KEY = "dci:recent-tickers";
const MAX_RECENT = 5;

type TransactionDraft = {
  date: string;
  ticker: string;
  side: TradeSide;
  strategy: TradeStrategy | "";
  quantity: string;
  price: string;
  note: string;
};

type FieldErrors = Partial<
  Record<"date" | "ticker" | "quantity" | "price" | "strategy" | "note", string>
>;

const defaultDraft: TransactionDraft = {
  date: new Date().toISOString().slice(0, 10),
  ticker: "",
  side: "BUY",
  strategy: "",
  quantity: "",
  price: "",
  note: "",
};

function getSearchRank(stock: Stock, keyword: string) {
  const ticker = stock.ticker.toLowerCase();
  const name = stock.name.toLowerCase();
  const sector = stock.sector.toLowerCase();

  if (ticker === keyword) return 0;
  if (ticker.startsWith(keyword)) return 1;
  if (name.startsWith(keyword)) return 2;
  if (sector.startsWith(keyword)) return 3;
  if (ticker.includes(keyword)) return 4;
  if (name.includes(keyword)) return 5;
  if (sector.includes(keyword)) return 6;
  return 7;
}

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
  const recent = getRecentTickers().filter((item) => item !== ticker);
  recent.unshift(ticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function isValidStrategy(value: string): value is TradeStrategy {
  return TRADE_STRATEGIES.includes(value as TradeStrategy);
}

interface TransactionFormProps {
  transactions: Transaction[];
  availableCash: number;
  onCreate: (transaction: TransactionInput) => Promise<void>;
  disabled?: boolean;
  readOnlyReason?: string;
  signalPrefill?: SignalExecutionPrefill | null;
  onClearSignalPrefill?: () => void;
}

export function TransactionForm({
  transactions,
  availableCash,
  onCreate,
  disabled = false,
  readOnlyReason = "Read-only access",
  signalPrefill = null,
  onClearSignalPrefill,
}: TransactionFormProps) {
  const { showToast } = useToast();
  const quantityInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelOrderButtonRef = useRef<HTMLButtonElement | null>(null);
  const suggestionListId = useId();
  const confirmTitleId = useId();
  const confirmDescriptionId = useId();
  const [draft, setDraft] = useState<TransactionDraft>(defaultDraft);
  const [tickerQuery, setTickerQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<TransactionInput | null>(null);

  useEffect(() => {
    if (!signalPrefill) return;

    setDraft((current) => ({
      ...current,
      ticker: signalPrefill.ticker,
      side: signalPrefill.side,
      strategy: "Signal-Based",
      quantity: "",
      price: String(signalPrefill.price),
    }));
    setTickerQuery(signalPrefill.ticker);
    setFieldErrors({});
    setSubmitError("");
    window.requestAnimationFrame(() => {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    });
  }, [signalPrefill]);

  useEffect(() => {
    if (!pendingOrder) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      cancelOrderButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingOrder(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pendingOrder]);

  const filteredStocks = useMemo(() => {
    const keyword = tickerQuery.trim().toLowerCase();
    if (!keyword) {
      const recent = getRecentTickers();
      const recentStocks = recent
        .map((ticker) => getStockByTicker(ticker))
        .filter(Boolean) as Stock[];
      const others = stockUniverseAlphabetical
        .filter((stock) => !recent.includes(stock.ticker))
        .slice(0, 8);
      return { recent: recentStocks, results: others };
    }

    const results = stockUniverseAlphabetical
      .filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(keyword) ||
          stock.name.toLowerCase().includes(keyword) ||
          stock.sector.toLowerCase().includes(keyword)
      )
      .sort((left, right) => {
        const rankDiff = getSearchRank(left, keyword) - getSearchRank(right, keyword);
        if (rankDiff !== 0) return rankDiff;
        return left.ticker.localeCompare(right.ticker);
      })
      .slice(0, 12);

    return { recent: [], results };
  }, [tickerQuery]);

  const normalizedTicker = draft.ticker.trim().toUpperCase();
  const selectedStock = getStockByTicker(normalizedTicker);
  const quantity = Number(draft.quantity);
  const price = Number(draft.price);
  const heldLots = normalizedTicker
    ? getHeldLotsByTicker(transactions, normalizedTicker)
    : 0;

  const orderSummary = useMemo(() => {
    const validQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    const validPrice = Number.isFinite(price) && price > 0 ? price : 0;
    const grossValue = calculateGrossTradeValue(validQuantity, validPrice);
    const brokerFee = calculateBrokerFee(draft.side, validQuantity, validPrice);
    const netValue = calculateNetTradeValue(draft.side, validQuantity, validPrice);
    const cashDelta = draft.side === "BUY" ? -netValue : netValue;
    const afterOrderCash = availableCash + cashDelta;

    return {
      totalShares: getTotalShares(validQuantity),
      grossValue,
      brokerFee,
      netValue,
      afterOrderCash,
      isAffordable: draft.side === "SELL" || afterOrderCash >= 0,
    };
  }, [availableCash, draft.side, price, quantity]);

  function updateDraft<K extends keyof TransactionDraft>(
    key: K,
    value: TransactionDraft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError("");
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
    const exact = getStockByTicker(normalized);
    updateDraft("ticker", exact ? exact.ticker : normalized);
  }

  function buildPayload(): TransactionInput | null {
    const errors: FieldErrors = {};
    const ticker = draft.ticker.trim().toUpperCase();
    const stock = getStockByTicker(ticker);
    const parsedQuantity = Number(draft.quantity);
    const parsedPrice = Number(draft.price);
    const today = new Date().toISOString().slice(0, 10);

    if (!draft.date) {
      errors.date = "Please select a trade date.";
    } else if (draft.date > today) {
      errors.date = "Trade date cannot be in the future.";
    }

    if (!ticker) {
      errors.ticker = "Please enter a ticker symbol.";
    } else if (!stock) {
      errors.ticker = "Select a valid IDX ticker from search results.";
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      errors.quantity = "Quantity must be at least 1 lot.";
    } else if (draft.side === "SELL" && parsedQuantity > heldLots) {
      errors.quantity = `You only hold ${formatNumber(heldLots)} lots of ${ticker}.`;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      errors.price = "Price must be greater than 0.";
    }

    if (!isValidStrategy(draft.strategy)) {
      errors.strategy = "Please choose a strategy.";
    }

    if (draft.note.trim().length > 280) {
      errors.note = "Note must be 280 characters or less.";
    }

    if (draft.side === "BUY" && orderSummary.afterOrderCash < 0) {
      errors.quantity = errors.quantity ?? "Insufficient cash for this order.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !stock || !isValidStrategy(draft.strategy)) {
      return null;
    }

    return {
      date: draft.date,
      ticker,
      side: draft.side,
      strategy: draft.strategy,
      quantity: parsedQuantity,
      price: parsedPrice,
      note: draft.note.trim() || undefined,
      signalId: signalPrefill?.signalId,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || disabled) return;

    setSubmitError("");
    const payload = buildPayload();
    if (!payload) return;

    setPendingOrder(payload);
  }

  async function confirmOrder() {
    if (!pendingOrder || isSubmitting || disabled) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await onCreate(pendingOrder);
      pushRecentTicker(pendingOrder.ticker);
      showToast({
        tone: "success",
        title: "Order placed",
        description: `${pendingOrder.side} ${pendingOrder.quantity} lots ${pendingOrder.ticker} @ ${formatCurrency(pendingOrder.price)}`,
      });
      setDraft({
        ...defaultDraft,
        date: new Date().toISOString().slice(0, 10),
        side: pendingOrder.side,
      });
      setTickerQuery("");
      setFieldErrors({});
      setPendingOrder(null);
      onClearSignalPrefill?.();
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save transaction.";
      setSubmitError(message);
      showToast({
        tone: "error",
        title: "Order failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBuy = draft.side === "BUY";
  const submitDisabled = isSubmitting || (isBuy && !orderSummary.isAffordable);

  return (
    <>
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
          <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
            <SideToggle
              value={draft.side}
              onChange={(side) => updateDraft("side", side)}
            />

            {disabled ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {readOnlyReason}
              </div>
            ) : null}

            {signalPrefill ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary-foreground">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    Executing Signal: <strong>{signalPrefill.side} {signalPrefill.ticker}</strong> —
                    fill in quantity to continue.
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onClearSignalPrefill?.()}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trade-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="trade-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => updateDraft("date", event.target.value)}
                  required
                  disabled={disabled}
                />
                {fieldErrors.date ? (
                  <p className="text-xs text-destructive">{fieldErrors.date}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="strategy" className="text-xs">
                  Strategy
                </Label>
                <Select
                  value={draft.strategy || undefined}
                  onValueChange={(value) => updateDraft("strategy", value as TradeStrategy)}
                  disabled={disabled}
                >
                  <SelectTrigger id="strategy" className="w-full">
                    <SelectValue placeholder="Choose strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_STRATEGIES.map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>
                        {strategy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.strategy ? (
                  <p className="text-xs text-destructive">{fieldErrors.strategy}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticker" className="text-xs">
                Ticker
              </Label>
              <p id="ticker-help" className="text-xs text-muted-foreground">
                Search by ticker, company name, or sector from the IDX80 universe.
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ticker"
                  value={tickerQuery}
                  onChange={(event) => handleTickerChange(event.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search IDX80 ticker..."
                  className="pl-8"
                  aria-invalid={Boolean(fieldErrors.ticker)}
                  aria-describedby={fieldErrors.ticker ? "ticker-error" : "ticker-help"}
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls={showSuggestions ? suggestionListId : undefined}
                  required
                  disabled={disabled}
                />
                {showSuggestions &&
                (filteredStocks.recent.length > 0 || filteredStocks.results.length > 0) ? (
                  <div
                    id={suggestionListId}
                    role="listbox"
                    aria-label="Ticker suggestions"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl backdrop-blur"
                  >
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
                            role="option"
                            aria-selected={draft.ticker === stock.ticker}
                            className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectTicker(stock.ticker);
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium">{stock.ticker}</span>
                                <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {stock.sector}
                                </span>
                              </div>
                              <p className="truncate text-[12px] text-muted-foreground">
                                {stock.name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : null}
                    {filteredStocks.results.length > 0 ? (
                      <>
                        {filteredStocks.recent.length > 0 ? (
                          <div className="my-1 border-t border-border/60" />
                        ) : null}
                        {filteredStocks.recent.length === 0 ? (
                          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            IDX80 Universe
                          </p>
                        ) : null}
                        {filteredStocks.results.map((stock) => (
                          <button
                            key={stock.ticker}
                            type="button"
                            role="option"
                            aria-selected={draft.ticker === stock.ticker}
                            className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectTicker(stock.ticker);
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium">{stock.ticker}</span>
                                <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {stock.sector}
                                </span>
                              </div>
                              <p className="truncate text-[12px] text-muted-foreground">
                                {stock.name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {fieldErrors.ticker ? (
                <p id="ticker-error" className="text-xs text-destructive">
                  {fieldErrors.ticker}
                </p>
              ) : selectedStock ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{selectedStock.name}</span>
                    <span className="rounded-full border border-border/70 px-2 py-0.5 uppercase tracking-wide text-muted-foreground">
                      {selectedStock.sector}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs">
                  Qty (lots)
                </Label>
                <Input
                  id="quantity"
                  ref={quantityInputRef}
                  type="number"
                  min="1"
                  step="1"
                  value={draft.quantity}
                  onChange={(event) => updateDraft("quantity", event.target.value)}
                  placeholder="10"
                  aria-invalid={Boolean(fieldErrors.quantity)}
                  aria-describedby={
                    fieldErrors.quantity
                      ? "quantity-error"
                      : normalizedTicker && draft.side === "SELL"
                        ? "quantity-help"
                        : undefined
                  }
                  required
                  disabled={disabled}
                />
                {fieldErrors.quantity ? (
                  <p id="quantity-error" className="text-xs text-destructive">
                    {fieldErrors.quantity}
                  </p>
                ) : normalizedTicker && draft.side === "SELL" ? (
                  <p id="quantity-help" className="text-xs text-muted-foreground">
                    Available to sell: {formatNumber(heldLots)} lots
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs">
                  Price (IDR)
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  step="1"
                  value={draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                  placeholder="9300"
                  aria-invalid={Boolean(fieldErrors.price)}
                  aria-describedby={fieldErrors.price ? "price-error" : undefined}
                  required
                  disabled={disabled}
                />
                {fieldErrors.price ? (
                  <p id="price-error" className="text-xs text-destructive">
                    {fieldErrors.price}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm"
              aria-live="polite"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Estimated Order Summary
              </p>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total Shares</span>
                  <span className="font-medium">
                    {formatNumber(orderSummary.totalShares)} shares
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Gross Value</span>
                  <span className="font-medium">{formatCurrency(orderSummary.grossValue)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Broker Fee ({isBuy ? "0.15%" : "0.25%"})
                  </span>
                  <span className="font-medium">{formatCurrency(orderSummary.brokerFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">
                    {isBuy ? "Net Value" : "Estimated Proceeds"}
                  </span>
                  <span className="font-semibold">{formatCurrency(orderSummary.netValue)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Available Cash</span>
                  <span>{formatCurrency(availableCash)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">After Order Cash</span>
                  <span
                    className={cn(
                      "font-semibold",
                      orderSummary.afterOrderCash >= 0 ? "text-foreground" : "text-red-400"
                    )}
                  >
                    {formatCurrency(orderSummary.afterOrderCash)}
                  </span>
                </div>
              </div>
            </div>

            {isBuy && !orderSummary.isAffordable ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>Insufficient cash. Reduce lots or wait for new capital.</span>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="trade-note" className="text-xs">
                  Note
                </Label>
                <span className="text-xs text-muted-foreground">
                  {draft.note.trim().length}/280
                </span>
              </div>
              <Textarea
                id="trade-note"
                value={draft.note}
                onChange={(event) => updateDraft("note", event.target.value)}
                placeholder="Trade rationale (optional)"
                rows={3}
                className="min-h-20 resize-none"
                aria-invalid={Boolean(fieldErrors.note)}
                aria-describedby={fieldErrors.note ? "trade-note-error" : "trade-note-help"}
                disabled={disabled}
              />
              <p id="trade-note-help" className="text-xs text-muted-foreground">
                Keep the rationale concise so it remains readable in reports.
              </p>
              {fieldErrors.note ? (
                <p id="trade-note-error" className="text-xs text-destructive">
                  {fieldErrors.note}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}

            {!disabled ? (
              <Button
                type="submit"
                className={cn(
                  "mt-auto w-full font-semibold transition-colors",
                  isBuy
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
                disabled={submitDisabled}
                title={!orderSummary.isAffordable ? "Insufficient cash" : undefined}
              >
                {isBuy ? "Review Buy Order" : "Review Sell Order"}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {pendingOrder ? (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="flex h-full w-full items-stretch justify-center sm:items-center sm:p-6">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={confirmTitleId}
              aria-describedby={confirmDescriptionId}
              tabIndex={-1}
              className="flex h-full w-full flex-col border border-border/70 bg-card p-5 shadow-2xl sm:h-auto sm:max-w-lg sm:rounded-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Confirm Order
                  </p>
                  <h3 id={confirmTitleId} className="mt-1 text-xl font-semibold">
                    {pendingOrder.side} {pendingOrder.ticker}
                  </h3>
                  <p id={confirmDescriptionId} className="mt-2 text-sm text-muted-foreground">
                    Review the order details below before sending the transaction to your journal.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingOrder(null)}
                  aria-label="Close order confirmation"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Side</span>
                  <span className="font-medium">{pendingOrder.side}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Ticker</span>
                  <span className="font-medium">{pendingOrder.ticker}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Strategy</span>
                  <span className="font-medium">{pendingOrder.strategy}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">
                    {formatNumber(pendingOrder.quantity)} lots
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatCurrency(pendingOrder.price)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Broker Fee</span>
                  <span className="font-medium">
                    {formatCurrency(
                      calculateBrokerFee(
                        pendingOrder.side,
                        pendingOrder.quantity,
                        pendingOrder.price
                      )
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <span className="text-muted-foreground">
                    {pendingOrder.side === "BUY" ? "Total Cost" : "Estimated Proceeds"}
                  </span>
                  <span className="text-base font-semibold">
                    {formatCurrency(
                      calculateNetTradeValue(
                        pendingOrder.side,
                        pendingOrder.quantity,
                        pendingOrder.price
                      )
                    )}
                  </span>
                </div>
              </div>

              {submitError ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
                <Button
                  ref={cancelOrderButtonRef}
                  type="button"
                  variant="ghost"
                  onClick={() => setPendingOrder(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={cn(
                    pendingOrder.side === "BUY"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  )}
                  onClick={() => void confirmOrder()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm Order"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
