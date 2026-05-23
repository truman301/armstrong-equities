import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail, renderDigestHtml } from '@/lib/email'

// GET /api/cron/daily-digest -- sends the daily digest email.
//
// Vercel Cron triggers this with Authorization: Bearer ${CRON_SECRET}; we
// honor the same shape so the route can be hit manually for testing too.
//
// Contents: latest PM desk note + count and list of open drafts + a button
// to /review. Recipient is hard-coded in lib/email.ts.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<Response> {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: latestTick } = await supabase
    .from('firm_ticks')
    .select('tick_number, tick_date, summary')
    .not('summary', 'is', null)
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestTick) {
    return NextResponse.json({ ok: true, skipped: 'no tick summary yet' })
  }

  const { data: drafts } = await supabase
    .from('writeups')
    .select('id, title, companies(ticker)')
    .is('published_at', null)
    .order('id', { ascending: false })

  type Row = {
    id: string
    title: string
    companies:
      | { ticker: string }
      | { ticker: string }[]
      | null
  }
  const draftList = ((drafts as Row[] | null) ?? []).map((d) => {
    const c = Array.isArray(d.companies) ? d.companies[0] : d.companies
    return { id: d.id, title: d.title, ticker: c?.ticker ?? '?' }
  })

  const html = renderDigestHtml({
    tickNumber: latestTick.tick_number as number,
    tickDate: latestTick.tick_date as string,
    deskNote: latestTick.summary as string,
    drafts: draftList,
  })

  const subject =
    draftList.length > 0
      ? `Armstrong Equities · Tick ${latestTick.tick_number} · ${draftList.length} to review`
      : `Armstrong Equities · Tick ${latestTick.tick_number} · desk note`

  const result = await sendEmail(subject, html)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    message_id: result.id,
    drafts: draftList.length,
    tick_number: latestTick.tick_number,
  })
}
