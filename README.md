# DCI Trading Journal

DCI Trading Journal is a focused trading workspace for Indonesian equities. It combines portfolio journaling, cash discipline, execution review, and QuantLite signal visibility in one interface that is easier to understand than a raw internal dashboard, but still rigorous enough for real portfolio operations.

The product is designed to feel credible in front of internal stakeholders, partners, or future public audiences. Instead of looking like a developer demo, it is structured around clarity:

- Live portfolio view with market-aware pricing
- Signal Center connected to the QuantLite pipeline
- Order entry with validation, confirmation, and strategy tagging
- Cash flow tracking that stays aligned with trading activity
- Exportable reports for review and communication
- Methodology and metrics pages that explain what the system is doing

## What The Product Does

DCI helps a portfolio operator move through the real workflow of trading:

1. Review fresh BUY, SELL, HOLD, or ALERT signals from the quant engine
2. Check cash, open positions, and portfolio concentration
3. Execute or dismiss a signal with a documented strategy label
4. Track resulting portfolio, trade journal, and cash ledger updates
5. Export reports and review performance against IHSG

This makes the journal useful both as an execution assistant and as a transparent review layer.

## Why It Feels More Public-Ready

Several parts of the app are intentionally built to support trust and explainability:

- Authentication and role-based access keep portfolio data private
- Viewer mode allows read-only access without exposing write actions
- Signal lifecycle is explicit: Active, Executed, Dismissed, or Expired
- Metric cards now include explanatory tooltips
- About and methodology sections explain risk, signals, and performance metrics
- Alpha is measured against real IHSG benchmark data, not a placeholder series

## Core Experience

### Dashboard

The dashboard surfaces portfolio value, return, daily P/L, active signals, risk posture, win rate, drawdown, and alpha versus IHSG. Market status and refresh cadence are aware of Jakarta trading hours.

### Signal Center

Signals published by the QuantLite engine flow into the journal with conviction, regime context, and trade-ticket metadata. The journal can generate in-app notifications for:

- new signals
- executed signals
- expired signals
- order placement
- entry-zone portfolio alerts when market price reaches a signal target

### Order Entry

Order entry includes:

- required strategy selection
- live fee and cash impact preview
- holding and cash checks
- signal execution prefill
- confirmation before write

### Cash Flow

Cash is treated as first-class portfolio state. Deposits, withdrawals, dividends, order flows, and broker fees are merged into a running balance ledger.

### Reporting

The app can export PDF and Excel reports covering portfolio summary, trade journal, strategy performance, and cash flow.

## QuantLite Integration

This journal is intended to pair with the `DCI-Quantitative-Trading` engine.

The strongest production setup is:

- QuantLite publishes `quant_signals`
- QuantLite updates `market_data_cache`
- DCI Trading Journal reads those tables and turns them into a user-facing workflow

If the quant engine and the website use different Supabase projects, the bridge can mirror signals and market cache into the journal project without changing the journal UX.

That separation is useful because the quant engine remains the canonical source of signal intelligence, while the journal becomes the execution and review layer.

## Security And Controls

Implemented controls include:

- cookie-based Supabase SSR auth
- route protection through proxy middleware
- `admin` and `viewer` role gating
- authenticated API routes
- server-side payload validation with `zod`
- server-side fee calculation
- CSP and security headers in [next.config.ts](/D:/DCI-Trading-Journal/next.config.ts)

## For Operators

If you are setting up the app for real use, the main technical guide is here:

- [Deployment Guide](/D:/DCI-Trading-Journal/docs/DEPLOYMENT.md)

It covers:

- environment setup
- Supabase migrations
- auth user seeding
- QuantLite integration checks
- staging smoke test checklist

## Local Development

Recommended runtime: Node.js 24 LTS.

1. Copy environment variables

```bash
cp .env.example .env.local
```

2. Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Install and run

```bash
npm install
npm run dev
```

4. Verify the app

```bash
npm run lint
npm run build
```

## Operator Helper Scripts

This repo now includes lightweight production helper scripts:

```bash
npm run supabase:check
npm run auth:list
npm run auth:seed
```

`supabase:check` inspects core Supabase readiness.
It verifies the journal tables plus the QuantLite bridge tables used for signals, run history, delivery logs, equity snapshots, and market cache.

`auth:list` prints current auth users and their UUIDs.

`auth:seed` creates or updates initial `admin` and `viewer` users when these variables are set:

- `DCI_ADMIN_EMAIL`
- `DCI_ADMIN_PASSWORD`
- `DCI_VIEWER_EMAIL`
- `DCI_VIEWER_PASSWORD`

The helper scripts also support legacy env naming:

- `SUPABASE_URL`
- `SUPABASE_KEY`

## Current Production Reality Check

Before public or semi-public rollout, make sure:

- at least one `admin` auth user exists
- Supabase migrations have been applied
- QuantLite is writing to `quant_signals` and `market_data_cache`
- staging smoke tests pass end-to-end

Without those items, the UI can build and run, but the live product will still feel incomplete.
