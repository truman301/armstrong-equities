import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchQuote, fetchKeyMetrics } from '@/lib/fmp'
import { computeComps, type CompInput } from '@/lib/models/comps'

// Daily Vercel Cron. Recomputes peer comps within each sector and stores a
// dated row per company in comps_results.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest): Promise<Response> {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, ticker, sector_id')
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Build a CompInput per company from the FMP quote and key metrics.
  const bySector = new Map<string, { id: string; input: CompInput }[]>()
  const skipped: { ticker: string; reason: string }[] = []

  for (const c of companies ?? []) {
    try {
      const [quote, km] = await Promise.all([
        fetchQuote(c.ticker),
        fetchKeyMetrics(c.ticker),
      ])
      if (!quote || !km || quote.price <= 0 || quote.marketCap <= 0) {
        skipped.push({ ticker: c.ticker, reason: 'missing quote or key metrics' })
        continue
      }
      const input: CompInput = {
        ticker: c.ticker,
        price: quote.price,
        sharesOutstanding: quote.marketCap / quote.price,
        netDebt: km.enterpriseValue - km.marketCap,
        ebitda: km.evToEBITDA ? km.enterpriseValue / km.evToEBITDA : 0,
        revenue: km.evToSales ? km.enterpriseValue / km.evToSales : 0,
      }
      const key = c.sector_id ?? 'none'
      const arr = bySector.get(key) ?? []
      arr.push({ id: c.id, input })
      bySector.set(key, arr)
    } catch (e) {
      skipped.push({
        ticker: c.ticker,
        reason: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // Comps are computed within a sector, then stored one row per company.
  const runDate = new Date().toISOString().slice(0, 10)
  const rows: Record<string, unknown>[] = []

  for (const group of bySector.values()) {
    const results = computeComps(group.map((g) => g.input))
    for (const r of results) {
      const company = group.find((g) => g.input.ticker === r.ticker)
      if (!company) continue
      rows.push({
        company_id: company.id,
        run_date: runDate,
        ev_ebitda: r.evEbitda,
        ev_sales: r.evSales,
        peer_median_ev_ebitda: r.peerMedianEvEbitda,
        peer_median_ev_sales: r.peerMedianEvSales,
        implied_price: r.impliedPriceMedian,
        implied_upside: r.impliedUpside,
      })
    }
  }

  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from('comps_results')
      .upsert(rows, { onConflict: 'company_id,run_date' })
    if (upErr) {
      return Response.json({ error: upErr.message }, { status: 500 })
    }
  }

  return Response.json({ ok: true, runDate, computed: rows.length, skipped })
}
