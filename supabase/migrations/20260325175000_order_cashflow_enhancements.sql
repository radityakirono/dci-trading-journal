alter table public.transactions
  add column if not exists strategy text default 'Manual';

update public.transactions
set strategy = 'Manual'
where strategy is null;

alter table public.transactions
  alter column strategy set default 'Manual',
  alter column strategy set not null;

alter table public.transactions
  drop constraint if exists transactions_strategy_check;

alter table public.transactions
  add constraint transactions_strategy_check check (
    strategy in (
      'Signal-Based',
      'Breakout',
      'Swing Trade',
      'Value Investing',
      'Momentum',
      'Manual'
    )
  );

alter table public.cash_journal
  drop constraint if exists cash_journal_type_check;

alter table public.cash_journal
  add constraint cash_journal_type_check check (
    type in ('DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'ADJUSTMENT')
  );
