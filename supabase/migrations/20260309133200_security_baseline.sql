-- DCI Security Baseline
-- Run this script in Supabase SQL Editor before production deployment.

create extension if not exists pgcrypto;

-- Core financial tables (created if missing).
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ticker text not null,
  side text not null check (side in ('BUY', 'SELL')),
  quantity integer not null check (quantity > 0),
  price bigint not null check (price > 0),
  fee bigint not null check (fee >= 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')),
  amount bigint not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  ticker text not null,
  signal_type text not null check (signal_type in ('BUY', 'SELL', 'HOLD', 'ALERT')),
  message text not null,
  source text,
  confidence numeric(5, 4),
  read_at timestamptz
);

create table if not exists public.market_data_cache (
  ticker text primary key,
  price numeric(18, 4) not null check (price >= 0),
  prev_close numeric(18, 4),
  change_pct numeric(12, 8),
  volume bigint,
  source text not null default 'quant-market-stream',
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'market_data_cache'
      and column_name = 'change_pct'
      and is_generated = 'ALWAYS'
  ) then
    alter table public.market_data_cache drop column change_pct;
    alter table public.market_data_cache add column change_pct numeric(12, 8);
  end if;
end
$$;

-- Ensure owner columns exist for row-level security.
alter table if exists public.transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.cash_journal
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.signal_notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.market_data_cache
  add column if not exists price numeric(18, 4),
  add column if not exists prev_close numeric(18, 4),
  add column if not exists change_pct numeric(12, 8),
  add column if not exists volume bigint,
  add column if not exists source text not null default 'quant-market-stream',
  add column if not exists updated_at timestamptz not null default now();

update public.market_data_cache
set change_pct = round(((price - prev_close) / prev_close)::numeric, 8)
where prev_close > 0
  and (change_pct is null or abs(change_pct) > 1);

alter table if exists public.transactions
  alter column user_id set default auth.uid();

alter table if exists public.cash_journal
  alter column user_id set default auth.uid();

alter table if exists public.signal_notifications
  alter column user_id set default auth.uid();

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_cash_journal_user_date
  on public.cash_journal (user_id, date desc);

create index if not exists idx_signal_notifications_user_created
  on public.signal_notifications (user_id, created_at desc);

create index if not exists idx_market_data_cache_updated_at
  on public.market_data_cache (updated_at desc);

-- Strict row-level security for core tables.
alter table if exists public.transactions enable row level security;
alter table if exists public.cash_journal enable row level security;
alter table if exists public.signal_notifications enable row level security;
alter table if exists public.market_data_cache enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

drop policy if exists "cash_journal_select_own" on public.cash_journal;
create policy "cash_journal_select_own"
  on public.cash_journal for select
  using (auth.uid() = user_id);

drop policy if exists "cash_journal_insert_own" on public.cash_journal;
create policy "cash_journal_insert_own"
  on public.cash_journal for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "cash_journal_update_own" on public.cash_journal;
create policy "cash_journal_update_own"
  on public.cash_journal for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cash_journal_delete_own" on public.cash_journal;
create policy "cash_journal_delete_own"
  on public.cash_journal for delete
  using (auth.uid() = user_id);

drop policy if exists "signal_notifications_select_own" on public.signal_notifications;
create policy "signal_notifications_select_own"
  on public.signal_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "signal_notifications_insert_own_or_service" on public.signal_notifications;
create policy "signal_notifications_insert_own_or_service"
  on public.signal_notifications for insert
  with check (
    auth.role() = 'service_role'
    or (auth.role() = 'authenticated' and auth.uid() = user_id)
  );

drop policy if exists "signal_notifications_update_own" on public.signal_notifications;
create policy "signal_notifications_update_own"
  on public.signal_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "signal_notifications_delete_own" on public.signal_notifications;
create policy "signal_notifications_delete_own"
  on public.signal_notifications for delete
  using (auth.uid() = user_id);

drop policy if exists "market_data_cache_select_authenticated" on public.market_data_cache;
create policy "market_data_cache_select_authenticated"
  on public.market_data_cache for select
  using (auth.role() in ('authenticated', 'service_role'));

drop policy if exists "market_data_cache_insert_service_role" on public.market_data_cache;
create policy "market_data_cache_insert_service_role"
  on public.market_data_cache for insert
  with check (auth.role() = 'service_role');

drop policy if exists "market_data_cache_update_service_role" on public.market_data_cache;
create policy "market_data_cache_update_service_role"
  on public.market_data_cache for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "market_data_cache_delete_service_role" on public.market_data_cache;
create policy "market_data_cache_delete_service_role"
  on public.market_data_cache for delete
  using (auth.role() = 'service_role');

-- Centralized audit trail for sensitive mutations.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user_created
  on public.audit_logs (user_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
  on public.audit_logs for select
  using (auth.uid() = user_id);

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create or replace function public.log_financial_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  entity_id_value text;
  before_payload jsonb;
  after_payload jsonb;
begin
  actor_id := coalesce(new.user_id, old.user_id);
  entity_id_value := coalesce(new.id::text, old.id::text);
  before_payload := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'user_id' else null end;
  after_payload := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'user_id' else null end;

  if actor_id is not null and entity_id_value is not null then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, payload)
    values (
      actor_id,
      tg_op,
      tg_table_name,
      entity_id_value,
      jsonb_build_object('before', before_payload, 'after', after_payload)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_transactions_audit on public.transactions;
create trigger trg_transactions_audit
after insert or update or delete on public.transactions
for each row
execute function public.log_financial_mutation();

drop trigger if exists trg_cash_journal_audit on public.cash_journal;
create trigger trg_cash_journal_audit
after insert or update or delete on public.cash_journal
for each row
execute function public.log_financial_mutation();
