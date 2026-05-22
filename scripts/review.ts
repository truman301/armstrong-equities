/**
 * Review gate for published research.
 *
 *   npx tsx scripts/review.ts               list draft writeups
 *   npx tsx scripts/review.ts show <id>     print a draft's full content
 *   npx tsx scripts/review.ts publish <id>  publish a draft
 *   npx tsx scripts/review.ts reject <id>   delete a draft
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
  const { data, error } = await supabase
    .from('writeups')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .is('published_at', null)
    .select('title')
  if (error) throw error
  if (!data || data.length === 0) {
    console.error(`No draft with id ${id} (already published, or not found).`)
    process.exit(1)
  }
  console.log(`Published: ${data[0].title}`)
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
  console.error(`Unknown command: ${cmd}. Use show, publish, or reject.`)
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
