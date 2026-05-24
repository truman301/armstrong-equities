-- Migration 0006: bd_notes table.
--
-- Persists the Business Development Lead's daily and weekly written outputs.
-- The weekly wrap reads the past seven days of dailies so BD doesn't repeat
-- itself, and so a future /bd page can render the full archive.
--
-- Run once in the Supabase SQL editor. Same RLS posture as the other tables.

create table if not exists bd_notes (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('daily', 'weekly')),
  note_date   date not null,
  content     text not null,
  created_at  timestamptz default now()
);

create index if not exists bd_notes_kind_date_idx
  on bd_notes (kind, note_date desc);
