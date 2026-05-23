-- Migration 0004: contact_messages table.
--
-- Stores submissions from the /contact page form. Read them in the Supabase
-- table editor or SQL editor; mark a row read by setting read_at = now().
--
-- Run once in the Supabase SQL editor. Same RLS posture as the other tables
-- (run without RLS).

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists contact_messages_created_idx
  on contact_messages (created_at desc);
