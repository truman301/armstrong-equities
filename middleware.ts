import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths exempted from session auth:
//   /login              the sign-in page itself
//   /api/auth/*         the login + logout endpoints
//   /api/research/ingest, /api/firm/tick-report
//                       GitHub Actions pushes from the firm repo, bearer-authed
//   /api/cron/*         Vercel cron endpoints, header-authed
//
// Static assets and Next.js internals are already excluded by the matcher
// regex below (anything containing a dot, plus _next/static and _next/image).
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/',
  '/api/research/ingest',
  '/api/firm/tick-report',
  '/api/firm/scoreboard',
  '/api/cron/',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p,
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    } else {
      loginUrl.searchParams.delete('redirect')
    }
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Run on every page request except Next.js internals, the favicon, and any
  // asset path containing a dot. The dot-exclusion also lets /office-floor.png
  // and /avatars/*.png stream without going through auth (they're harmless
  // images and the pages that reference them are gated).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
