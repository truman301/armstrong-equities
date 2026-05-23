/**
 * Manually send the daily digest. Useful for local testing or for sending the
 * digest off-schedule (e.g. after publishing something mid-day).
 *
 *   npx tsx scripts/send-digest.ts
 *
 * Pulls the latest firm_ticks summary, counts open drafts, and sends via
 * Resend to the address configured in lib/email.ts. Requires .env.local with
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY.
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })
loadDotenv()

import { sendEmail, renderDigestHtml } from '../lib/email'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data: latestTick, error: tickErr } = await supabase
    .from('firm_ticks')
    .select('tick_number, tick_date, summary')
    .not('summary', 'is', null)
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (tickErr) throw tickErr
  if (!latestTick) {
    console.error('No tick summary yet; nothing to send.')
    process.exit(1)
  }

  const { data: draftRows, error: draftErr } = await supabase
    .from('writeups')
    .select('id, title, companies(ticker)')
    .is('published_at', null)
    .order('id', { ascending: false })
  if (draftErr) throw draftErr

  type Row = {
    id: string
    title: string
    companies:
      | { ticker: string }
      | { ticker: string }[]
      | null
  }
  const drafts = ((draftRows as Row[] | null) ?? []).map((d) => {
    const c = Array.isArray(d.companies) ? d.companies[0] : d.companies
    return { id: d.id, title: d.title, ticker: c?.ticker ?? '?' }
  })

  const html = renderDigestHtml({
    tickNumber: latestTick.tick_number as number,
    tickDate: latestTick.tick_date as string,
    deskNote: latestTick.summary as string,
    drafts,
  })
  const subject =
    drafts.length > 0
      ? `Armstrong Equities · Tick ${latestTick.tick_number} · ${drafts.length} to review`
      : `Armstrong Equities · Tick ${latestTick.tick_number} · desk note`

  const res = await sendEmail(subject, html)
  if (res.error) {
    console.error('Send failed:', res.error)
    process.exit(1)
  }
  console.log(`Sent. message_id=${res.id} drafts=${drafts.length} tick=${latestTick.tick_number}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
