import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/picks/reopen -- flips a closed pick back to open and clears the
// exit fields. Useful if a close was a mistake. Body: { pick_id: string }
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pickId = typeof body.pick_id === 'string' ? body.pick_id.trim() : ''
  if (!pickId) {
    return NextResponse.json({ error: 'pick_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('picks')
    .update({
      status: 'open',
      exit_date: null,
      exit_price: null,
      exit_reason: null,
    })
    .eq('id', pickId)
    .eq('status', 'closed')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
