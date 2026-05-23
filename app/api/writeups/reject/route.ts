import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/writeups/reject -- deletes a draft writeup. Only drafts can be
// rejected (published_at IS NULL). Body: { writeup_id: string }
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = typeof body.writeup_id === 'string' ? body.writeup_id.trim() : ''
  if (!id) {
    return NextResponse.json(
      { error: 'writeup_id is required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('writeups')
    .delete()
    .eq('id', id)
    .is('published_at', null)
    .select('id')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'No draft to reject (already published or not found)' },
      { status: 404 },
    )
  }
  return NextResponse.json({ ok: true })
}
