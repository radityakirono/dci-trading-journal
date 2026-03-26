# Deployment Guide

This guide is for moving DCI Trading Journal from local development into a usable staging or production environment.

## 1. Runtime And Hosting

- Node.js `24.x`
- Next.js `16.2.1`
- Supabase for auth, data, and RLS
- QuantLite engine for `quant_signals` and `market_data_cache`

## 2. Environment Variables

Add these variables to `.env.local`, your server, or your hosting platform:

### Application runtime

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Optional helper-script fallback

- `SUPABASE_URL`
- `SUPABASE_KEY`

### Optional first-time auth seeding

- `DCI_ADMIN_EMAIL`
- `DCI_ADMIN_PASSWORD`
- `DCI_VIEWER_EMAIL`
- `DCI_VIEWER_PASSWORD`

## 3. Apply Supabase Schema

Run these SQL files in the Supabase SQL Editor for the target project:

1. [001_security_baseline.sql](/D:/DCI-Trading-Journal/supabase/sql/001_security_baseline.sql)
2. [20260325175000_order_cashflow_enhancements.sql](/D:/DCI-Trading-Journal/supabase/migrations/20260325175000_order_cashflow_enhancements.sql)
3. [20260325193000_signal_actions.sql](/D:/DCI-Trading-Journal/supabase/migrations/20260325193000_signal_actions.sql)
4. [20260325221000_notifications_center.sql](/D:/DCI-Trading-Journal/supabase/migrations/20260325221000_notifications_center.sql)
5. [20260326121500_market_data_cache.sql](/D:/DCI-Trading-Journal/supabase/migrations/20260326121500_market_data_cache.sql)
6. [20260326133000_quant_bridge_tables.sql](/D:/DCI-Trading-Journal/supabase/migrations/20260326133000_quant_bridge_tables.sql)

These cover:

- RLS and ownership columns
- order and cash-flow enhancements
- signal lifecycle persistence
- notifications center
- shared market-price cache for QuantLite and the website
- QuantLite bridge tables for signals, run history, delivery log, and equity snapshots

If the API still reports a missing table immediately after SQL execution, run:

```sql
NOTIFY pgrst, 'reload schema';
```

## 4. Seed Auth Users

The app is not deploy-ready until at least one admin user exists.

Use:

```bash
npm run auth:list
npm run auth:seed
```

`auth:list` shows the current auth users and their UUIDs. This is useful when you need to set `JOURNAL_OWNER_USER_ID` in the quant repo.

`auth:seed` will create or update:

- one `admin` user from `DCI_ADMIN_EMAIL` / `DCI_ADMIN_PASSWORD`
- one optional `viewer` user from `DCI_VIEWER_EMAIL` / `DCI_VIEWER_PASSWORD`

It writes the role to both `app_metadata.role` and `user_metadata.role`, with `app_metadata.role` as the effective source used by the app.

## 5. Check Supabase Readiness

Run:

```bash
npm run supabase:check
```

This checks:

- auth user availability
- `transactions`
- `cash_journal`
- `signal_actions`
- `notifications`
- `equity_snapshots`
- `quant_signals`
- `signal_runs`
- `signal_delivery_log`
- `market_data_cache`

## 6. Connect QuantLite

The journal expects the quant stack to populate:

- `quant_signals`
- `market_data_cache`

If you are using the `DCI-Quantitative-Trading` repo, make sure its environment points to the same Supabase project as the journal deployment.

For a split setup where the quant runtime keeps its own Supabase project, the bridge now supports:

- `JOURNAL_SUPABASE_URL`
- `JOURNAL_SUPABASE_SERVICE_ROLE_KEY`
- `JOURNAL_OWNER_USER_ID`

And for market cache only, an optional explicit override:

- `MARKET_CACHE_SUPABASE_URL`
- `MARKET_CACHE_SUPABASE_SERVICE_ROLE_KEY`

When `MARKET_CACHE_SUPABASE_*` is not set, `market_stream.py` will use `JOURNAL_SUPABASE_*` first, then fall back to the quant runtime `SUPABASE_*` project.

Production behavior is strongest when:

- QuantLite publishes signal rows on schedule
- market stream updates cached prices during trading hours
- the journal only consumes and presents those results

## 7. Staging Smoke Test

Before production cutover, verify:

### Authentication

- unauthenticated visit to `/` redirects to `/login`
- admin can sign in
- viewer can sign in
- viewer cannot create orders or cash entries

### Portfolio and execution

- dashboard loads without mock fallback for authenticated empty accounts
- initial capital prompt appears for a new account with no deposit
- order form validates and confirms before write
- order creation updates journal and cash flow

### Signal workflow

- signal feed loads from `quant_signals`
- signal execute prefills order form
- dismiss moves the signal to history
- notifications load and can be marked read

### Market and benchmark

- market status badge updates
- live prices load
- IHSG benchmark endpoint returns data
- alpha vs IHSG renders without errors

### Exports

- PDF export downloads
- Excel export downloads

## 8. Production Cutover

Recommended order:

1. Apply Supabase schema
2. Seed auth users
3. Confirm QuantLite is writing to the same Supabase project
4. Deploy app to staging
5. Run smoke tests
6. Promote to production

## 9. Important Limitation

From the current credentials pattern, auth user management can be automated, but SQL migrations still need to be run through Supabase SQL Editor or another database administration path unless you add a separate migration pipeline.
