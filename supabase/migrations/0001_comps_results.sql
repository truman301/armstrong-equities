-- Migration 0001: align comps_results with the EV/EBITDA + EV/Sales model.
--
-- The original comps_results columns assumed an EV/EBITDA + P/E model. The
-- comps were rebuilt on EV/EBITDA + EV/Sales, since P/E is uninformative for
-- near-breakeven gaming operators, so the table needs matching columns.
--
-- comps_results is empty, so dropping and recreating it loses no data.
-- Run this once in the Supabase SQL editor.

drop table if exists comps_results;

create table comps_results (
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
