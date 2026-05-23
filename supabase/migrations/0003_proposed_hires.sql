-- Migration 0003: proposed_hires table.
--
-- New roles "hired" from the /agents page. They appear on the office floor as
-- pending agents until you wire them into the firm's actual agent roster
-- (writing a `.claude/agents/<slug>.md` in the firm repo from their job
-- description).
--
-- Run once in the Supabase SQL editor. Same RLS posture as the other tables
-- (run without RLS).

create table if not exists proposed_hires (
  id              uuid primary key default gen_random_uuid(),
  role_slug       text not null,
  role_name       text not null,
  pitch           text,
  description     text not null,
  status          text default 'pending' check (status in ('pending', 'active', 'declined')),
  created_at      timestamptz default now()
);
