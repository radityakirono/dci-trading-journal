import { z } from "zod";

import { TRADE_STRATEGIES } from "@/lib/trading";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const tickerPattern = /^[A-Z0-9]{4,8}$/;

export const transactionInputSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format."),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(tickerPattern, "Ticker must be 4-8 uppercase alphanumeric chars."),
  side: z.enum(["BUY", "SELL"]),
  strategy: z.enum(TRADE_STRATEGIES),
  quantity: z
    .number()
    .int("Quantity must be a whole number of lots.")
    .positive("Quantity must be greater than zero.")
    .max(5_000_000, "Quantity is too large."),
  price: z
    .number()
    .positive("Price must be greater than zero.")
    .max(1_000_000_000, "Price is too large."),
  note: z
    .string()
    .trim()
    .max(280, "Note must be 280 characters or less.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  signalId: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
  const today = new Date().toISOString().slice(0, 10);
  if (value.date > today) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Trade date cannot be in the future.",
      path: ["date"],
    });
  }
});

export const cashFlowEntryInputSchema = z
  .object({
    date: z.string().regex(datePattern, "Invalid date format."),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "DIVIDEND", "ADJUSTMENT"]),
    amount: z
      .number()
      .finite("Amount must be a valid number.")
      .min(-1_000_000_000_000, "Amount is too low.")
      .max(1_000_000_000_000, "Amount is too high."),
    note: z
      .string()
      .trim()
      .max(500, "Note must be 500 characters or less.")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .superRefine((value, context) => {
    if (value.type !== "ADJUSTMENT" && value.amount <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposits, withdrawals, and dividends must be greater than zero.",
        path: ["amount"],
      });
    }

    if (value.type === "ADJUSTMENT" && value.amount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adjustment amount cannot be zero.",
        path: ["amount"],
      });
    }
  });

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(120),
});

export const priceTargetInputSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(tickerPattern, "Ticker must be 4-8 uppercase alphanumeric chars."),
  targetPrice: z
    .number()
    .positive("Target price must be greater than zero.")
    .max(1_000_000_000, "Target price is too large."),
  currentPrice: z
    .number()
    .positive("Current price must be greater than zero.")
    .max(1_000_000_000, "Current price is too large.")
    .nullable()
    .optional(),
});
