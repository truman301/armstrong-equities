/**
 * Backfills 5 years of daily EOD price data from Financial Modeling Prep
 * into the Supabase `prices` table for every company in `companies`.
 *
 * Idempotent: upserts on (company_id, date), so safe to re-run.
 * Continues past per-ticker failures (one bad ticker won't kill the batch).
 *
 * Place at: scripts/backfill-prices.ts in the Next.js repo.
 *
 * One-time install (from repo root):
 *   pnpm add -D tsx dotenv
 *   pnpm add @supabase/supabase-js
 *
 * Required env in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (server-side; bypasses RLS so we can write)
 *   FMP_API_KEY
 *
 * Run:
 *   pnpm tsx scripts/backfill-prices.ts
 */

import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local (Next.js convention) first, then .env as fallback.
loadDotenv({ path: '.env.local' })
loadDotenv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FMP_KEY = process.env.FMP_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FMP_KEY) {
  console.error(
    'Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FMP_API_KEY',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

interface Company {
  id: string
  ticker: string
  exchange: string | null
}

interface FmpRow {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
  vwap: number
}

const today = new Date().toISOString().slice(0, 10)
const fiveYearsAgo = (() => {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - 5)
  return d.toISOString().slice(0, 10)
})()

async function fetchFmp(ticker: string): Promise<FmpRow[]> {
  const url =
    `https://financialmodelingprep.com/stable/historical-price-eod/full` +
    `?symbol=${encodeURIComponent(ticker)}` +
    `&from=${fiveYearsAgo}` +
    `&to=${today}` +
    `&apikey=${FMP_KEY}`

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`FMP ${ticker} HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json()
  if (!Array.isArray(json)) {
    throw new Error(
      `FMP ${ticker} unexpected shape: ${JSON.stringify(json).slice(0, 200)}`,
    )
  }
  return json as FmpRow[]
}

async function upsertPrices(companyId: string, rows: FmpRow[]): Promise<number> {
  const records = rows.map((r) => ({
    company_id: companyId,
    date: r.date,
    close: r.close,
    volume: r.volume,
  }))

  // Batch to stay well under Supabase's payload limits.
  const batchSize = 500
  let written = 0
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase
      .from('prices')
      .upsert(batch, { onConflict: 'company_id,date' })
    if (error) throw error
    written += batch.length
  }
  return written
}

async function main() {
  console.log(`Backfill window: ${fiveYearsAgo} to ${today}`)

  const { data: companies, error: companiesErr } = await supabase
    .from('companies')
    .select('id, ticker, exchange')
    .order('ticker')

  if (companiesErr) throw companiesErr
  if (!companies || companies.length === 0) {
    console.warn('No companies found in the companies table.')
    return
  }

  console.log(`\n${companies.length} companies to backfill:\n`)

  let ok = 0
  let failed = 0
  let totalRows = 0

  for (const c of companies as Company[]) {
    const t0 = Date.now()
    try {
      const rows = await fetchFmp(c.ticker)
      const written = await upsertPrices(c.id, rows)
      const elapsed = Date.now() - t0
      console.log(
        `  OK  ${c.ticker.padEnd(6)} ${String(written).padStart(5)} rows  (${elapsed} ms)`,
      )
      ok++
      totalRows += written
    } catch (err) {
      const elapsed = Date.now() - t0
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `  ERR ${c.ticker.padEnd(6)} FAILED              (${elapsed} ms)  ${msg}`,
      )
      failed++
    }
  }

  console.log(
    `\nDone. ${ok} succeeded, ${failed} failed, ${totalRows} rows upserted.`,
  )
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
