/**
 * Read-only inspection of the Supabase database.
 * Reports which expected tables exist and their row counts, and samples
 * the sectors and companies tables so we know what data is currently there.
 *
 * Run from the repo root: npx tsx scripts/inspect-db.ts
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })
loadDotenv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const EXPECTED = [
  'sectors',
  'companies',
  'prices',
  'financials',
  'recommendations',
  'writeups',
  'comps_results',
]

async function main() {
  console.log(`Supabase project: ${SUPABASE_URL}\n`)
  console.log('Expected table row counts:')
  for (const t of EXPECTED) {
    const { count, error } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`  ${t.padEnd(16)} ERROR: ${error.message}`)
    } else {
      console.log(`  ${t.padEnd(16)} ${count ?? 0} rows`)
    }
  }

  for (const t of ['sectors', 'companies']) {
    const { data, error } = await supabase.from(t).select('*').limit(25)
    if (error) {
      console.log(`\n${t}: cannot read -- ${error.message}`)
    } else {
      console.log(`\n${t} (${data?.length ?? 0} rows shown):`)
      console.log(JSON.stringify(data, null, 2))
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
