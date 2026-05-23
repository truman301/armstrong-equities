import { supabase } from '@/lib/supabase'
import {
  computePickMetrics,
  computePortfolioMetrics,
  type PickRow,
  type PickMetrics,
  type PriceRow,
} from '@/lib/picks-perf'
import { OpenPositionsTable, ClosedPositionsTable, type Row } from './positions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Performance',
}

function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '·'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function colorClass(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'text-ink'
  return v >= 0 ? 'text-emerald-700' : 'text-accent'
}

function Stat({
  label,
  value,
  color,
  hint,
}: {
  label: string
  value: string
  color?: string
  hint?: string
}) {
  return (
    <div className="border border-divider bg-paper-dim/30 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-ink-mute">
        {label}
      </p>
      <p
        className={`mt-3 font-display text-3xl font-semibold tracking-tight ${color ?? 'text-ink'}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  )
}

export default async function PerformancePage() {
  // 1) Picks with joined company
  const { data: rawPicks } = await supabase
    .from('picks')
    .select(
      `id, company_id, writeup_id, recommendation, thesis,
       entry_date, entry_price, target_price,
       status, exit_date, exit_price, exit_reason,
       companies ( ticker, name )`,
    )
    .order('entry_date', { ascending: false })

  type RawPick = PickRow & {
    companies: { ticker: string; name: string } | { ticker: string; name: string }[] | null
  }

  const picks = (rawPicks as RawPick[] | null ?? []).map((p) => {
    const c = Array.isArray(p.companies) ? p.companies[0] : p.companies
    return {
      ...p,
      entry_price: Number(p.entry_price),
      target_price: p.target_price === null ? null : Number(p.target_price),
      exit_price: p.exit_price === null ? null : Number(p.exit_price),
      ticker: c?.ticker ?? '?',
      company_name: c?.name ?? '?',
    }
  })

  // 2) Latest prices for the picks' companies + SPY series
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

  // 3) Metrics
  const metricsByPick = new Map<string, PickMetrics>()
  for (const p of picks) {
    metricsByPick.set(p.id, computePickMetrics(p, pricesByCompany, spyPrices))
  }
  const port = computePortfolioMetrics(picks, metricsByPick)

  // 4) Shape rows for the client tables
  const toRow = (p: (typeof picks)[number]): Row => {
    const m = metricsByPick.get(p.id)!
    return {
      pick_id: p.id,
      ticker: p.ticker,
      name: p.company_name,
      entry_date: p.entry_date,
      entry_price: p.entry_price,
      mark_price: m.mark_price,
      return_pct: m.return_pct,
      alpha_pct: m.alpha_vs_spy_pct,
      days_held: m.days_held,
      target_price: p.target_price,
      exit_date: p.exit_date,
      exit_reason: p.exit_reason,
    }
  }
  const openRows = picks.filter((p) => p.status === 'open').map(toRow)
  const closedRows = picks.filter((p) => p.status === 'closed').map(toRow)

  const benchMissing = spyPrices.length === 0

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Track record
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Performance
      </h2>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
        Every research note Truman publishes adds the ticker to the tracked
        portfolio. Entry price is the close on the day of publication; alpha is
        each pick&apos;s return less SPY over the same holding period.
      </p>

      {benchMissing && (
        <p className="mt-6 border-l-2 border-accent pl-4 text-[13px] text-ink-mute">
          SPY prices haven&apos;t been pulled yet, so alpha is unavailable. The
          next daily price cron will fix this.
        </p>
      )}

      {/* Headline metrics */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total picks" value={String(port.total_picks)} />
        <Stat
          label="Open"
          value={String(port.open_picks)}
          hint={`${port.closed_picks} closed`}
        />
        <Stat
          label="Win rate"
          value={fmtPct(port.win_rate_pct)}
          color={colorClass(
            port.win_rate_pct === null ? null : port.win_rate_pct - 50,
          )}
          hint={`vs 50% coin flip`}
        />
        <Stat
          label="Avg return"
          value={fmtPct(port.avg_return_pct)}
          color={colorClass(port.avg_return_pct)}
        />
        <Stat
          label="Median return"
          value={fmtPct(port.median_return_pct)}
          color={colorClass(port.median_return_pct)}
        />
        <Stat
          label="Avg alpha vs SPY"
          value={fmtPct(port.avg_alpha_vs_spy_pct)}
          color={colorClass(port.avg_alpha_vs_spy_pct)}
        />
        <Stat
          label="Best / Worst"
          value={`${fmtPct(port.best_return_pct)} / ${fmtPct(port.worst_return_pct)}`}
        />
        <Stat
          label="Avg hold"
          value={
            port.avg_days_held === null
              ? '·'
              : `${Math.round(port.avg_days_held)}d`
          }
          hint={
            port.avg_winner_pct === null && port.avg_loser_pct === null
              ? undefined
              : `${fmtPct(port.avg_winner_pct)} / ${fmtPct(port.avg_loser_pct)} W/L`
          }
        />
      </div>

      {/* Open positions */}
      <section className="mt-14">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Open positions ({openRows.length})
        </p>
        <div className="mt-4 border-t border-divider pt-4">
          <OpenPositionsTable rows={openRows} />
        </div>
      </section>

      {/* Closed positions */}
      <section className="mt-14">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Closed positions ({closedRows.length})
        </p>
        <div className="mt-4 border-t border-divider pt-4">
          <ClosedPositionsTable rows={closedRows} />
        </div>
      </section>
    </div>
  )
}
