create table if not exists public.equity_snapshots (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  cash numeric(18, 2) not null default 0,
  holdings_value numeric(18, 2) not null default 0,
  total_equity numeric(18, 2) generated always as (cash + holdings_value) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_runs (
  run_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_key text not null unique,
  scheduled_for timestamptz not null,
  market_date date not null,
  window_hour integer not null check (window_hour between 0 and 23),
  status text not null default 'RUNNING' check (
    status in ('RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')
  ),
  trigger_source text not null default 'PIPELINE' check (
    trigger_source in ('PIPELINE', 'MANUAL', 'API')
  ),
  engine_name text not null,
  engine_version text,
  source_repo text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quant_signals (
  id uuid primary key default gen_random_uuid(),
  external_signal_key text not null unique,
  run_id text references public.signal_runs(run_id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  signal_ts timestamptz not null,
  ticker text not null,
  ticker_short text not null,
  signal_type text not null check (signal_type in ('BUY', 'SELL', 'HOLD', 'ALERT')),
  raw_action text not null,
  model_name text not null,
  message text not null,
  source text not null,
  regime text,
  conviction numeric(5, 4),
  supporting_metrics jsonb not null default '{}'::jsonb,
  trade_ticket jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'PENDING' check (
    delivery_status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')
  ),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  quant_signal_id uuid not null references public.quant_signals(id) on delete cascade,
  channel text not null default 'TELEGRAM' check (
    channel in ('TELEGRAM', 'EMAIL', 'WEBHOOK', 'IN_APP')
  ),
  status text not null check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  error_message text,
  response_payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table if exists public.equity_snapshots enable row level security;
alter table if exists public.signal_runs enable row level security;
alter table if exists public.quant_signals enable row level security;
alter table if exists public.signal_delivery_log enable row level security;

create index if not exists idx_equity_snapshots_date
  on public.equity_snapshots (date desc);

create index if not exists idx_signal_runs_started_at
  on public.signal_runs (started_at desc);

create index if not exists idx_quant_signals_signal_ts
  on public.quant_signals (signal_ts desc);

create index if not exists idx_quant_signals_external_key
  on public.quant_signals (external_signal_key);

create index if not exists idx_quant_signals_run_id
  on public.quant_signals (run_id);

create index if not exists idx_signal_delivery_log_signal
  on public.signal_delivery_log (quant_signal_id, created_at desc);

drop policy if exists "equity_snapshots_select_authenticated" on public.equity_snapshots;
create policy "equity_snapshots_select_authenticated"
  on public.equity_snapshots for select
  using (auth.role() in ('authenticated', 'service_role'));

drop policy if exists "equity_snapshots_write_service_role" on public.equity_snapshots;
create policy "equity_snapshots_write_service_role"
  on public.equity_snapshots for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "signal_runs_select_authenticated" on public.signal_runs;
create policy "signal_runs_select_authenticated"
  on public.signal_runs for select
  using (auth.role() in ('authenticated', 'service_role'));

drop policy if exists "signal_runs_write_service_role" on public.signal_runs;
create policy "signal_runs_write_service_role"
  on public.signal_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "quant_signals_select_authenticated" on public.quant_signals;
create policy "quant_signals_select_authenticated"
  on public.quant_signals for select
  using (auth.role() in ('authenticated', 'service_role'));

drop policy if exists "quant_signals_write_service_role" on public.quant_signals;
create policy "quant_signals_write_service_role"
  on public.quant_signals for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "signal_delivery_log_select_own_or_service" on public.signal_delivery_log;
create policy "signal_delivery_log_select_own_or_service"
  on public.signal_delivery_log for select
  using (auth.role() = 'service_role' or auth.uid() = user_id);

drop policy if exists "signal_delivery_log_write_service_role" on public.signal_delivery_log;
create policy "signal_delivery_log_write_service_role"
  on public.signal_delivery_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and exists (
    select 1
    from pg_class
    where relname = 'quant_signals'
      and relnamespace = 'public'::regnamespace
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quant_signals'
  ) then
    alter publication supabase_realtime add table public.quant_signals;
  end if;
exception
  when undefined_object then null;
end
$$;
