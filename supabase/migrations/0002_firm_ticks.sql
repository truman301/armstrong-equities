-- Migration 0002: firm_ticks table.
--
-- Records each tick the firm runs (on GitHub Actions or manually): the board
-- state, a one-screen summary, and a per-agent activity blob. The /agents
-- page reads this table to show what each agent is currently working on and
-- recent history.
--
-- per_agent is a jsonb keyed by agent slug, e.g.:
--   {
--     "portfolio-manager":  { "status": "idle",     "current_ticker": null, "verdict": null },
--     "analyst-gaming":     { "status": "building", "current_ticker": "KAMBI", "verdict": "draft complete" },
--     "associate-gaming":   { "status": "idle",     "current_ticker": null, "verdict": null },
--     "analyst-software":   { "status": "building", "current_ticker": "CXM",   "verdict": "draft complete" },
--     "associate-software": { "status": "idle",     "current_ticker": null, "verdict": null }
--   }
--
-- Run this once in the Supabase SQL editor.

create table if not exists firm_ticks (
  id              uuid primary key default gen_random_uuid(),
  tick_number     int not null,
  tick_date       date not null,
  board_markdown  text,
  summary         text,
  per_agent       jsonb,
  created_at      timestamptz default now(),
  unique (tick_number)
);
