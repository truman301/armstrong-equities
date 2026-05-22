-- Armstrong Equities -- canonical database schema (Supabase / Postgres).
--
-- The tables already exist in the live Supabase project. This file is the
-- version-controlled source of truth and is safe to re-run: every statement
-- is idempotent (CREATE TABLE IF NOT EXISTS).
--
-- comps_results was migrated after initial setup; see
-- supabase/migrations/0001_comps_results.sql. This file reflects the result.
--
-- Review gate convention: a row in `writeups` with published_at IS NULL is a
-- draft awaiting Truman's review. Setting published_at to a timestamp
-- publishes it. The agent ingest endpoint inserts drafts with published_at
-- explicitly set to NULL (the column default is now(), so it must be set).

create table if not exists sectors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  sector_id   uuid references sectors(id),
  ticker      text unique not null,
  name        text not null,
  exchange    text,
  currency    text default 'USD',
  description text,
  website     text,
  created_at  timestamptz default now()
);

create table if not exists prices (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id),
  date        date not null,
  close       numeric not null,
  volume      bigint,
  created_at  timestamptz default now(),
  unique (company_id, date)
);

create table if not exists financials (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid references companies(id),
  period             text not null,
  period_end         date,
  revenue            numeric,
  ebitda             numeric,
  net_income         numeric,
  eps                numeric,
  total_debt         numeric,
  cash               numeric,
  shares_outstanding numeric,
  source             text default 'FMP',
  created_at         timestamptz default now()
);

create table if not exists recommendations (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid references companies(id),
  rating                 text check (rating in ('Buy','Hold','Sell')),
  price_target           numeric,
  current_price_at_issue numeric,
  thesis_summary         text,
  issued_at              timestamptz default now(),
  is_active              boolean default true
);

create table if not exists writeups (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies(id),
  type          text check (type in ('Initiation','Update','Earnings Note')),
  title         text not null,
  body_markdown text,
  published_at  timestamptz default now()
);

create table if not exists comps_results (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid references companies(id),
  run_date              date not null,
  ev_ebitda             numeric,
  ev_sales              numeric,
  peer_median_ev_ebitda numeric,
  peer_median_ev_sales  numeric,
  implied_price         numeric,
  implied_upside        numeric,
  created_at            timestamptz default now(),
  unique (company_id, run_date)
);
