-- Migration 0005: picks (tracked-portfolio table) + SPY benchmark.
--
-- Truman publishes a research note via `scripts/review.ts publish <id>`. When
-- the writeup is the first published note for that company, the publish step
-- inserts a row here. Entry price = most recent close from the prices table.
-- Subsequent notes (updates, earnings) don't create new picks; they attach
-- to the existing open pick.
--
-- SPY is inserted as a companies row so the daily update-prices cron pulls
-- its closes automatically. The /performance page uses SPY closes to compute
-- alpha for each pick over its holding period.
--
-- Run once in the Supabase SQL editor. Same RLS posture as the other tables
-- (run without RLS).

create table if not exists picks (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  writeup_id      uuid references writeups(id) on delete set null,
  recommendation  text not null default 'long'
                    check (recommendation in ('long', 'short')),
  thesis          text,
  entry_date      date not null,
  entry_price     numeric(14, 4) not null,
  target_price    numeric(14, 4),
  status          text not null default 'open'
                    check (status in ('open', 'closed')),
  exit_date       date,
  exit_price      numeric(14, 4),
  exit_reason     text,
  created_at      timestamptz default now()
);

create index if not exists picks_company_status_idx on picks (company_id, status);
create index if not exists picks_entry_date_idx on picks (entry_date desc);

-- SPY benchmark (will be price-tracked by the existing update-prices cron).
insert into companies (ticker, name, exchange, currency, description)
values (
  'SPY',
  'SPDR S&P 500 ETF Trust',
  'NYSEARCA',
  'USD',
  'S&P 500 benchmark for portfolio alpha. Not a covered company; price-only.'
)
on conflict (ticker) do nothing;
