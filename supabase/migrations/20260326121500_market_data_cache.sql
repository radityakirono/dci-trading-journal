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

create index if not exists idx_market_data_cache_updated_at
  on public.market_data_cache (updated_at desc);

alter table if exists public.market_data_cache enable row level security;

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
