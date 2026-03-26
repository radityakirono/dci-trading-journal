create table if not exists public.signal_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_id text not null,
  status text not null check (status in ('EXECUTED', 'DISMISSED')),
  action_date timestamptz not null default now(),
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  executed_price bigint,
  executed_quantity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, signal_id)
);

alter table public.signal_actions enable row level security;

create index if not exists idx_signal_actions_user_signal
  on public.signal_actions (user_id, signal_id);

drop policy if exists "signal_actions_select_own" on public.signal_actions;
create policy "signal_actions_select_own"
  on public.signal_actions for select
  using (auth.uid() = user_id);

drop policy if exists "signal_actions_insert_own" on public.signal_actions;
create policy "signal_actions_insert_own"
  on public.signal_actions for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "signal_actions_update_own" on public.signal_actions;
create policy "signal_actions_update_own"
  on public.signal_actions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "signal_actions_delete_own" on public.signal_actions;
create policy "signal_actions_delete_own"
  on public.signal_actions for delete
  using (auth.uid() = user_id);

drop trigger if exists trg_signal_actions_updated_at on public.signal_actions;
drop function if exists public.set_signal_actions_updated_at();
create or replace function public.set_signal_actions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_signal_actions_updated_at
before update on public.signal_actions
for each row
execute function public.set_signal_actions_updated_at();
