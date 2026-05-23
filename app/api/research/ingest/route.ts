import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Agent publish endpoint. The firm's pipeline POSTs a PM-approved research
// note here; it lands as a DRAFT (published_at = null) for Truman's review.
// If the ticker is not yet under coverage, the optional `company` block in
// the payload is used to insert the company first.
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

  let { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id')
    .eq('ticker', ticker)
    .maybeSingle()
  if (companyErr) {
    return Response.json({ error: companyErr.message }, { status: 500 })
  }

  // New-ticker path: insert the company from the optional `company` block.
  if (!company) {
    const ci =
      body.company &&
      typeof body.company === 'object' &&
      !Array.isArray(body.company)
        ? (body.company as Record<string, unknown>)
        : null
    if (!ci) {
      return Response.json(
        {
          error: `No company under coverage with ticker ${ticker}. Include a "company" block (name, exchange, sector_slug) in the payload to add it.`,
        },
        { status: 404 },
      )
    }
    const cName = typeof ci.name === 'string' ? ci.name.trim() : ''
    const cExchange = typeof ci.exchange === 'string' ? ci.exchange.trim() : ''
    const cSlug =
      typeof ci.sector_slug === 'string' ? ci.sector_slug.trim() : ''
    if (!cName || !cExchange || !cSlug) {
      return Response.json(
        {
          error: 'company block must include name, exchange, and sector_slug',
        },
        { status: 400 },
      )
    }
    const { data: sector, error: sectorErr } = await supabase
      .from('sectors')
      .select('id')
      .eq('slug', cSlug)
      .maybeSingle()
    if (sectorErr) {
      return Response.json({ error: sectorErr.message }, { status: 500 })
    }
    if (!sector) {
      return Response.json(
        { error: `Sector not found with slug ${cSlug}` },
        { status: 400 },
      )
    }
    const cCurrency = typeof ci.currency === 'string' ? ci.currency : 'USD'
    const cDescription =
      typeof ci.description === 'string' ? ci.description : null
    const cWebsite = typeof ci.website === 'string' ? ci.website : null

    const { data: newCompany, error: insertErr } = await supabase
      .from('companies')
      .insert({
        ticker,
        name: cName,
        exchange: cExchange,
        currency: cCurrency,
        description: cDescription,
        website: cWebsite,
        sector_id: sector.id,
      })
      .select('id')
      .single()
    if (insertErr) {
      return Response.json({ error: insertErr.message }, { status: 500 })
    }
    company = newCompany
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
