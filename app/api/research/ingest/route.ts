import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Agent publish endpoint. The firm's pipeline POSTs a PM-approved research
// note here; it lands as a DRAFT (published_at = null) for Truman's review.
export const dynamic = 'force-dynamic'

const WRITEUP_TYPES = ['Initiation', 'Update', 'Earnings Note']

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

  const ticker = typeof body.ticker === 'string' ? body.ticker.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const bodyMarkdown =
    typeof body.body_markdown === 'string' ? body.body_markdown : ''
  const type =
    typeof body.type === 'string' && WRITEUP_TYPES.includes(body.type)
      ? body.type
      : 'Initiation'

  if (!ticker || !title || !bodyMarkdown) {
    return Response.json(
      { error: 'ticker, title, and body_markdown are required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id')
    .eq('ticker', ticker)
    .maybeSingle()
  if (companyErr) {
    return Response.json({ error: companyErr.message }, { status: 500 })
  }
  if (!company) {
    return Response.json(
      { error: `No company under coverage with ticker ${ticker}` },
      { status: 404 },
    )
  }

  // published_at = null keeps this out of the public archive until reviewed.
  const { data: writeup, error: writeupErr } = await supabase
    .from('writeups')
    .insert({
      company_id: company.id,
      type,
      title,
      body_markdown: bodyMarkdown,
      published_at: null,
    })
    .select('id')
    .single()
  if (writeupErr) {
    return Response.json({ error: writeupErr.message }, { status: 500 })
  }

  return Response.json(
    { ok: true, status: 'draft', writeup_id: writeup.id },
    { status: 201 },
  )
}
