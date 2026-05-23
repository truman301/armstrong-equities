import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookie-aware Supabase client for Server Components, Route Handlers, and
// Server Actions. Reads and refreshes the auth cookie from the Next.js
// request, so calling `supabase.auth.getUser()` on a request returns the
// signed-in user (or null) without re-asking for credentials.
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll from a Server Component is a no-op (read-only). The
            // middleware refreshes the cookie on the next request anyway.
          }
        },
      },
    },
  )
}
