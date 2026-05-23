import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/writeups/publish -- approves a draft writeup. Mirrors the logic
// in scripts/review.ts publish:
//   1. Sets writeups.published_at to now()
//   2. If the company has no open pick, creates one with entry_price equal
//      to the most recent close in the prices table
//   3. If a pick already exists, attaches this writeup_id to it (so an
//      Update or Earnings Note doesn't double-count)
//
// Body: { writeup_id: string }
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id =
    typeof body.writeup_id === 'string' ? body.writeup_id.trim() : ''
  if (!id) {
    return NextResponse.json(
      { error: 'writeup_id is required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: draft, error: fetchErr } = await supabase
    .from('writeups')
    .select('id, title, company_id, published_at')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!draft) {
    return NextResponse.json({ error: 'Writeup not found' }, { status: 404 })
  }
  if (draft.published_at) {
    return NextResponse.json(
      { error: 'Writeup is already published' },
      { status: 409 },
    )
  }

  const { error: pubErr } = await supabase
    .from('writeups')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .is('published_at', null)
  if (pubErr) {
    return NextResponse.json({ error: pubErr.message }, { status: 500 })
  }

  if (!draft.company_id) {
    return NextResponse.json({
      ok: true,
      published: true,
      pick_opened: false,
      note: 'No company linked; no pick created.',
    })
  }

  const { data: existing } = await supabase
    .from('picks')
    .select('id')
    .eq('company_id', draft.company_id)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) {
    await supabase
      .from('picks')
      .update({ writeup_id: id })
      .eq('id', existing.id)
    return NextResponse.json({
      ok: true,
      published: true,
      pick_opened: false,
      linked_pick_id: existing.id,
      note: 'Attached to existing open pick.',
    })
  }

  const { data: latestPrice } = await supabase
    .from('prices')
    .select('close, date')
    .eq('company_id', draft.company_id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latestPrice) {
    return NextResponse.json({
      ok: true,
      published: true,
      pick_opened: false,
      warning:
        'No prices in the database for this company. Run the price-update cron or scripts/backfill-prices.ts, then retry via scripts/review.ts open-pick.',
    })
  }

  const { data: pick, error: pickErr } = await supabase
    .from('picks')
    .insert({
      company_id: draft.company_id,
      writeup_id: id,
      recommendation: 'long',
      thesis: draft.title,
      entry_date: latestPrice.date,
      entry_price: latestPrice.close,
    })
    .select('id')
    .single()
  if (pickErr) {
    return NextResponse.json({
      ok: true,
      published: true,
      pick_opened: false,
      error: pickErr.message,
    })
  }

  return NextResponse.json({
    ok: true,
    published: true,
    pick_opened: true,
    pick_id: pick.id,
    entry_price: Number(latestPrice.close),
    entry_date: latestPrice.date,
  })
}
