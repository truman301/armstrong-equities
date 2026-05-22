import { createClient } from '@supabase/supabase-js'

// Service-role client: bypasses row-level security, full read and write.
// Server only. Never import this from a Client Component.
// Created lazily (as a function, not a module-level const) so standalone
// scripts can load .env.local before the client is constructed.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
