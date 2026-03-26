create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'NEW_SIGNAL',
      'SIGNAL_EXECUTED',
      'SIGNAL_EXPIRED',
      'ORDER_PLACED',
      'PORTFOLIO_ALERT'
    )
  ),
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  related_entity_type text,
  related_entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, related_entity_type, related_entity_id)
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

alter table if exists public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own_or_service" on public.notifications;
create policy "notifications_insert_own_or_service"
  on public.notifications for insert
  with check (
    auth.role() = 'service_role'
    or (auth.role() = 'authenticated' and auth.uid() = user_id)
  );

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);

drop trigger if exists trg_notifications_updated_at on public.notifications;
drop function if exists public.set_notifications_updated_at();
create or replace function public.set_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.is_read and new.read_at is null then
    new.read_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_notifications_updated_at();
