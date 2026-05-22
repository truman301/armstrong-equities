/**
 * Seeds the Gaming coverage universe: the Sports Betting & iGaming sector
 * and its three covered companies (DKNG, FLUT, SRAD).
 *
 * Idempotent: upserts on sectors.slug and companies.ticker, so it is safe
 * to re-run. Additive only; it does not touch other rows.
 *
 * Run from the repo root: npx tsx scripts/seed.ts
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

const SECTOR = {
  name: 'Sports Betting & iGaming',
  slug: 'sports-betting-igaming',
  description:
    'Global operators in legal sports wagering, online casino, and daily fantasy. The thesis centers on the state-by-state rollout of US online sports betting and iGaming alongside profitability inflection at scale operators.',
}

const COMPANIES = [
  {
    ticker: 'DKNG',
    name: 'DraftKings Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    website: 'https://www.draftkings.com',
    description: 'US-focused sports betting and iGaming operator.',
  },
  {
    ticker: 'FLUT',
    name: 'Flutter Entertainment plc',
    exchange: 'NYSE',
    currency: 'USD',
    website: 'https://www.flutter.com',
    description:
      'Global operator, parent of FanDuel, PokerStars, Sky Bet, and Sportsbet.',
  },
  {
    ticker: 'SRAD',
    name: 'Sportradar Group AG',
    exchange: 'NASDAQ',
    currency: 'USD',
    website: 'https://www.sportradar.com',
    description:
      'Sports data and technology provider to operators, leagues, and media.',
  },
]

async function main() {
  const { data: sector, error: sectorErr } = await supabase
    .from('sectors')
    .upsert(SECTOR, { onConflict: 'slug' })
    .select('id, name, slug')
    .single()

  if (sectorErr) throw sectorErr
  console.log(`Sector: ${sector.name} [${sector.slug}] -> ${sector.id}`)

  const rows = COMPANIES.map((c) => ({ ...c, sector_id: sector.id }))
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'ticker' })
    .select('ticker, name')

  if (compErr) throw compErr
  console.log(
    `Companies upserted (${companies.length}): ${companies
      .map((c) => c.ticker)
      .join(', ')}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
