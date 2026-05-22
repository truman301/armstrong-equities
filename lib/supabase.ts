import { createClient } from '@supabase/supabase-js'

// Anon (public) read client for Server Components rendering pages.
// Respects row-level security; safe to import anywhere in the app.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
