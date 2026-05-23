import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/contact -- inserts a row into contact_messages. Called by the
// /contact page's form.
//
// The route inherits session auth from the middleware (the site is gated),
// so only signed-in users can submit. If /contact is ever opened to the
// public, exempt both /contact and /api/contact in middleware.ts.
export const dynamic = 'force-dynamic'

const MAX_NAME = 200
const MAX_EMAIL = 200
const MAX_SUBJECT = 200
const MAX_MESSAGE = 5000

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const subject =
    typeof body.subject === 'string' && body.subject.trim().length > 0
      ? body.subject.trim()
      : null
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Name, email, and message are required' },
      { status: 400 },
    )
  }
  if (
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    message.length > MAX_MESSAGE ||
    (subject !== null && subject.length > MAX_SUBJECT)
  ) {
    return NextResponse.json({ error: 'Field too long' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
