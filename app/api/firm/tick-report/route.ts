import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Endpoint the firm calls at the end of each /daily-tick to record what each
// agent did. The /agents page reads firm_ticks to show current focus and
// recent history.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  if (
    request.headers.get('authorization') !==
    `Bearer ${process.env.INGEST_TOKEN}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tickNumber =
    typeof body.tick_number === 'number' && Number.isFinite(body.tick_number)
      ? Math.trunc(body.tick_number)
      : null
  const tickDate = typeof body.tick_date === 'string' ? body.tick_date : ''
  const boardMarkdown =
    typeof body.board_markdown === 'string' ? body.board_markdown : null
  const summary = typeof body.summary === 'string' ? body.summary : null
  const perAgent =
    body.per_agent &&
    typeof body.per_agent === 'object' &&
    !Array.isArray(body.per_agent)
      ? (body.per_agent as Record<string, unknown>)
      : null

  if (tickNumber === null || tickNumber < 0 || !tickDate) {
    return Response.json(
      { error: 'tick_number (int) and tick_date (YYYY-MM-DD) are required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('firm_ticks')
    .upsert(
      {
        tick_number: tickNumber,
        tick_date: tickDate,
        board_markdown: boardMarkdown,
        summary,
        per_agent: perAgent,
      },
      { onConflict: 'tick_number' },
    )
    .select('id')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, tick_id: data.id }, { status: 201 })
}
