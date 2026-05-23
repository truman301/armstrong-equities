/**
 * Review gate for published research.
 *
 *   npx tsx scripts/review.ts                  list draft writeups
 *   npx tsx scripts/review.ts show <id>        print a draft's full content
 *   npx tsx scripts/review.ts publish <id>     publish a draft (also opens a pick
 *                                              on /performance for new tickers)
 *   npx tsx scripts/review.ts reject <id>      delete a draft
 *   npx tsx scripts/review.ts open-pick <id>   open a pick for a published
 *                                              writeup that missed one
 *
 * Drafts are writeups with published_at = null. The agent ingest endpoint
 * creates them; nothing reaches the public site until it is published here.
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })
loadDotenv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

function tickerOf(row: { companies: unknown }): string {
  const c = Array.isArray(row.companies) ? row.companies[0] : row.companies
  return (c as { ticker?: string } | null)?.ticker ?? '?'
}

async function listDrafts() {
  const { data, error } = await supabase
    .from('writeups')
    .select('id, type, title, companies(ticker)')
    .is('published_at', null)
  if (error) throw error
  if (!data || data.length === 0) {
    console.log('No drafts awaiting review.')
    return
  }
  console.log(`${data.length} draft(s) awaiting review:\n`)
  for (const w of data) {
    console.log(`  ${w.id}`)
    console.log(`    ${tickerOf(w)}  ${w.type}  ${w.title}\n`)
  }
  console.log('Read one with:  npx tsx scripts/review.ts show <id>')
}

async function show(id: string) {
  const { data, error } = await supabase
    .from('writeups')
    .select('type, title, body_markdown, published_at, companies(ticker)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    console.error(`No writeup with id ${id}`)
    process.exit(1)
  }
  const state = data.published_at ? 'PUBLISHED' : 'DRAFT'
  console.log(`\n${tickerOf(data)}  ${data.type}  [${state}]`)
  console.log(data.title)
  console.log('\n' + '-'.repeat(64) + '\n')
  console.log(data.body_markdown ?? '(empty)')
}

async function publish(id: string) {
  // Pull the draft first so we have company_id + title for the pick step.
  const { data: draft, error: fetchErr } = await supabase
    .from('writeups')
    .select('id, title, company_id, published_at')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!draft) {
    console.error(`No writeup with id ${id}`)
    process.exit(1)
  }
  if (draft.published_at) {
    console.error(`Already published: ${draft.title}`)
    process.exit(1)
  }

  // Flip published_at first; if this fails we don't touch picks.
  const { error: pubErr } = await supabase
    .from('writeups')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .is('published_at', null)
  if (pubErr) throw pubErr
  console.log(`Published: ${draft.title}`)

  if (!draft.company_id) {
    console.log('No company linked; skipping pick creation.')
    return
  }

  // If there's already an open pick on this company, just attach this writeup
  // to it (so update/earnings notes don't double-add).
  const { data: existing, error: existingErr } = await supabase
    .from('picks')
    .select('id, status')
    .eq('company_id', draft.company_id)
    .eq('status', 'open')
    .maybeSingle()
  if (existingErr) throw existingErr

  if (existing) {
    const { error: attachErr } = await supabase
      .from('picks')
      .update({ writeup_id: id })
      .eq('id', existing.id)
    if (attachErr) throw attachErr
    console.log(`Linked writeup to existing open pick ${existing.id}.`)
    return
  }

  // No existing pick: create one. Entry price = most recent close.
  const { data: latestPrice, error: priceErr } = await supabase
    .from('prices')
    .select('close, date')
    .eq('company_id', draft.company_id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (priceErr) throw priceErr
  if (!latestPrice) {
    console.error(
      'Cannot open a pick: no prices in the database for this company yet.',
    )
    console.error(
      'Run the price-update cron (or scripts/backfill-prices.ts), then re-run:',
    )
    console.error(`  npx tsx scripts/review.ts open-pick ${id}`)
    return
  }

  const { data: pick, error: insertErr } = await supabase
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
  if (insertErr) throw insertErr
  console.log(
    `Opened pick ${pick.id} at $${Number(latestPrice.close).toFixed(2)} (close on ${latestPrice.date}).`,
  )
}

// One-shot recovery: open a pick for an already-published writeup that didn't
// get one (e.g., because prices weren't loaded at publish time).
async function openPick(writeupId: string) {
  const { data: w, error } = await supabase
    .from('writeups')
    .select('id, title, company_id, published_at')
    .eq('id', writeupId)
    .maybeSingle()
  if (error) throw error
  if (!w || !w.published_at) {
    console.error('No published writeup with that id.')
    process.exit(1)
  }
  if (!w.company_id) {
    console.error('Writeup has no company_id.')
    process.exit(1)
  }

  const { data: existing } = await supabase
    .from('picks')
    .select('id')
    .eq('company_id', w.company_id)
    .eq('status', 'open')
    .maybeSingle()
  if (existing) {
    console.error(`Open pick already exists: ${existing.id}`)
    process.exit(1)
  }

  const { data: latestPrice, error: priceErr } = await supabase
    .from('prices')
    .select('close, date')
    .eq('company_id', w.company_id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (priceErr) throw priceErr
  if (!latestPrice) {
    console.error('No prices available for this company yet.')
    process.exit(1)
  }

  const { data: pick, error: insErr } = await supabase
    .from('picks')
    .insert({
      company_id: w.company_id,
      writeup_id: w.id,
      recommendation: 'long',
      thesis: w.title,
      entry_date: latestPrice.date,
      entry_price: latestPrice.close,
    })
    .select('id')
    .single()
  if (insErr) throw insErr
  console.log(
    `Opened pick ${pick.id} at $${Number(latestPrice.close).toFixed(2)} (close on ${latestPrice.date}).`,
  )
}

async function reject(id: string) {
  const { data, error } = await supabase
    .from('writeups')
    .delete()
    .eq('id', id)
    .is('published_at', null)
    .select('title')
  if (error) throw error
  if (!data || data.length === 0) {
    console.error(`No draft with id ${id} to reject.`)
    process.exit(1)
  }
  console.log(`Rejected and deleted: ${data[0].title}`)
}

async function main() {
  const [cmd, id] = process.argv.slice(2)
  if (!cmd) return listDrafts()
  if (!id) {
    console.error(`Usage: npx tsx scripts/review.ts ${cmd} <id>`)
    process.exit(1)
  }
  if (cmd === 'show') return show(id)
  if (cmd === 'publish') return publish(id)
  if (cmd === 'reject') return reject(id)
  if (cmd === 'open-pick') return openPick(id)
  console.error(
    `Unknown command: ${cmd}. Use show, publish, reject, or open-pick.`,
  )
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
