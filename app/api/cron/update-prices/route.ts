import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchDailyPrices } from '@/lib/fmp'

// Daily Vercel Cron. Refreshes recent end-of-day prices for every company.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest): Promise<Response> {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, ticker')
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const from = isoDaysAgo(7)
  const to = isoDaysAgo(0)
  const results: { ticker: string; rows?: number; error?: string }[] = []

  for (const c of companies ?? []) {
    try {
      const prices = await fetchDailyPrices(c.ticker, from, to)
      const records = prices.map((p) => ({
        company_id: c.id,
        date: p.date,
        close: p.close,
        volume: p.volume,
      }))
      if (records.length > 0) {
        const { error: upErr } = await supabase
          .from('prices')
          .upsert(records, { onConflict: 'company_id,date' })
        if (upErr) throw upErr
      }
      results.push({ ticker: c.ticker, rows: records.length })
    } catch (e) {
      results.push({
        ticker: c.ticker,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return Response.json({ ok: true, from, to, results })
}
