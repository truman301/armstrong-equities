// Shared scoreboard builder. Used by /api/firm/scoreboard (called by the
// firm's daily-tick orchestrator) and by the BD daily and weekly crons.

import { createAdminClient } from '@/lib/supabase-admin'
import {
  computePickMetrics,
  computePortfolioMetrics,
  type PickRow,
  type PickMetrics,
  type PriceRow,
} from '@/lib/picks-perf'

export interface ScoreboardData {
  total_picks: number
  open_picks: number
  closed_picks: number
  win_rate_pct: number | null
  avg_return_pct: number | null
  median_return_pct: number | null
  avg_alpha_vs_spy_pct: number | null
  avg_days_held: number | null
  avg_winner_pct: number | null
  avg_loser_pct: number | null
  best:
    | {
        ticker: string
        status: 'open' | 'closed'
        return_pct: number
        alpha_pct: number | null
        days_held: number
      }
    | null
  worst:
    | {
        ticker: string
        status: 'open' | 'closed'
        return_pct: number
        alpha_pct: number | null
        days_held: number
      }
    | null
  recent_notes: Array<{
    ticker: string
    title: string
    type: string | null
    published_at: string | null
  }>
}

export async function getScoreboard(): Promise<ScoreboardData> {
  const supabase = createAdminClient()

  const { data: rawPicks } = await supabase
    .from('picks')
    .select(
      `id, company_id, writeup_id, recommendation, thesis,
       entry_date, entry_price, target_price,
       status, exit_date, exit_price, exit_reason,
       companies(ticker, name)`,
    )
    .order('entry_date', { ascending: false })

  type RawPick = PickRow & {
    companies:
      | { ticker: string; name: string }
      | { ticker: string; name: string }[]
      | null
  }
  const picks = ((rawPicks as RawPick[] | null) ?? []).map((p) => ({
    ...p,
    entry_price: Number(p.entry_price),
    target_price: p.target_price === null ? null : Number(p.target_price),
    exit_price: p.exit_price === null ? null : Number(p.exit_price),
  }))
  const tickerByPickId = new Map<string, string>()
  for (const p of picks) {
    const c = Array.isArray(p.companies) ? p.companies[0] : p.companies
    tickerByPickId.set(p.id, c?.ticker ?? '?')
  }

  const companyIds = Array.from(new Set(picks.map((p) => p.company_id)))
  const pricesByCompany = new Map<string, PriceRow[]>()
  if (companyIds.length > 0) {
    const { data: pricesData } = await supabase
      .from('prices')
      .select('company_id, date, close')
      .in('company_id', companyIds)
      .order('date', { ascending: false })
    for (const row of pricesData ?? []) {
      const arr = pricesByCompany.get(row.company_id) ?? []
      arr.push({
        company_id: row.company_id,
        date: row.date,
        close: Number(row.close),
      })
      pricesByCompany.set(row.company_id, arr)
    }
  }

  const { data: spyCo } = await supabase
    .from('companies')
    .select('id')
    .eq('ticker', 'SPY')
    .maybeSingle()
  let spyPrices: PriceRow[] = []
  if (spyCo?.id) {
    const { data: sp } = await supabase
      .from('prices')
      .select('company_id, date, close')
      .eq('company_id', spyCo.id)
      .order('date', { ascending: false })
    spyPrices = (sp ?? []).map((r) => ({
      company_id: r.company_id,
      date: r.date,
      close: Number(r.close),
    }))
  }

  const metricsByPick = new Map<string, PickMetrics>()
  for (const p of picks) {
    metricsByPick.set(p.id, computePickMetrics(p, pricesByCompany, spyPrices))
  }
  const port = computePortfolioMetrics(picks, metricsByPick)

  type RankedPick = {
    ticker: string
    status: 'open' | 'closed'
    return_pct: number
    alpha_pct: number | null
    days_held: number
  }
  const ranked: RankedPick[] = picks
    .map((p) => ({
      ticker: tickerByPickId.get(p.id) ?? '?',
      status: p.status,
      return_pct: metricsByPick.get(p.id)?.return_pct ?? null,
      alpha_pct: metricsByPick.get(p.id)?.alpha_vs_spy_pct ?? null,
      days_held: metricsByPick.get(p.id)?.days_held ?? 0,
    }))
    .filter(
      (
        p,
      ): p is RankedPick =>
        p.return_pct !== null,
    )
  ranked.sort((a, b) => b.return_pct - a.return_pct)

  const { data: recent } = await supabase
    .from('writeups')
    .select('id, title, type, published_at, companies(ticker)')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5)
  type RawWriteup = {
    id: string
    title: string
    type: string | null
    published_at: string | null
    companies: { ticker: string } | { ticker: string }[] | null
  }
  const recentNotes = ((recent as RawWriteup[] | null) ?? []).map((r) => {
    const c = Array.isArray(r.companies) ? r.companies[0] : r.companies
    return {
      ticker: c?.ticker ?? '?',
      title: r.title,
      type: r.type,
      published_at: r.published_at,
    }
  })

  return {
    total_picks: port.total_picks,
    open_picks: port.open_picks,
    closed_picks: port.closed_picks,
    win_rate_pct: port.win_rate_pct,
    avg_return_pct: port.avg_return_pct,
    median_return_pct: port.median_return_pct,
    avg_alpha_vs_spy_pct: port.avg_alpha_vs_spy_pct,
    avg_days_held: port.avg_days_held,
    avg_winner_pct: port.avg_winner_pct,
    avg_loser_pct: port.avg_loser_pct,
    best: ranked[0] ?? null,
    worst: ranked.length > 0 ? ranked[ranked.length - 1] : null,
    recent_notes: recentNotes,
  }
}
