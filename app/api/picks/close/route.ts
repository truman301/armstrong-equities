import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/picks/close -- closes an open pick.
// Body: { pick_id: string, exit_reason?: string, exit_price?: number }
//
// If exit_price isn't supplied, the route uses the latest close from the
// prices table. If there's no price, the request fails 422 so the user can
// explicitly pass one.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pickId = typeof body.pick_id === 'string' ? body.pick_id.trim() : ''
  const reason =
    typeof body.exit_reason === 'string' && body.exit_reason.trim().length > 0
      ? body.exit_reason.trim()
      : null
  const explicitPrice =
    typeof body.exit_price === 'number' && Number.isFinite(body.exit_price)
      ? body.exit_price
      : null

  if (!pickId) {
    return NextResponse.json({ error: 'pick_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: pick, error: pickErr } = await supabase
    .from('picks')
    .select('id, company_id, status')
    .eq('id', pickId)
    .maybeSingle()
  if (pickErr) {
    return NextResponse.json({ error: pickErr.message }, { status: 500 })
  }
  if (!pick) {
    return NextResponse.json({ error: 'Pick not found' }, { status: 404 })
  }
  if (pick.status !== 'open') {
    return NextResponse.json({ error: 'Pick is already closed' }, { status: 409 })
  }

  let exitPrice = explicitPrice
  let exitDate = new Date().toISOString().slice(0, 10)
  if (exitPrice === null) {
    const { data: latest, error: priceErr } = await supabase
      .from('prices')
      .select('close, date')
      .eq('company_id', pick.company_id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (priceErr) {
      return NextResponse.json({ error: priceErr.message }, { status: 500 })
    }
    if (!latest) {
      return NextResponse.json(
        {
          error:
            'No price available to close at. Pass exit_price explicitly or run the price-update cron.',
        },
        { status: 422 },
      )
    }
    exitPrice = Number(latest.close)
    exitDate = latest.date
  }

  const { error: updateErr } = await supabase
    .from('picks')
    .update({
      status: 'closed',
      exit_date: exitDate,
      exit_price: exitPrice,
      exit_reason: reason,
    })
    .eq('id', pickId)
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, exit_date: exitDate, exit_price: exitPrice })
}
