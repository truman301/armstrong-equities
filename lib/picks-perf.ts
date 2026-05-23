// Performance math for the /performance page.
//
// All numbers are computed in JS from a small fetched dataset (picks + the
// price series for their tickers and SPY). Small enough that there's no
// reason to push the math into SQL.

export type PickRow = {
  id: string
  company_id: string
  writeup_id: string | null
  recommendation: 'long' | 'short'
  thesis: string | null
  entry_date: string // YYYY-MM-DD
  entry_price: number
  target_price: number | null
  status: 'open' | 'closed'
  exit_date: string | null
  exit_price: number | null
  exit_reason: string | null
}

export type PickWithCompany = PickRow & {
  ticker: string
  company_name: string
}

export type PriceRow = {
  company_id: string
  date: string // YYYY-MM-DD
  close: number
}

export type PickMetrics = {
  mark_price: number | null // exit_price if closed, else latest close
  mark_date: string | null
  return_pct: number | null
  days_held: number
  annualized_return_pct: number | null
  alpha_vs_spy_pct: number | null
  hit_target: boolean | null
}

export type PortfolioMetrics = {
  total_picks: number
  open_picks: number
  closed_picks: number
  win_rate_pct: number | null // share of picks where return > 0
  avg_return_pct: number | null
  median_return_pct: number | null
  best_return_pct: number | null
  worst_return_pct: number | null
  avg_alpha_vs_spy_pct: number | null
  avg_days_held: number | null
  avg_winner_pct: number | null
  avg_loser_pct: number | null
}

// ---------- helpers ----------

/**
 * Latest price on or before `target` date. Sorted-desc walk; small N.
 * Returns null if no price exists on/before target.
 */
function closeOnOrBefore(prices: PriceRow[], target: string): number | null {
  for (const row of prices) {
    if (row.date <= target) return row.close
  }
  return null
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00Z').getTime()
  const d2 = new Date(b + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round((d2 - d1) / 86_400_000))
}

function todayUtcIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

// ---------- pick metrics ----------

export function computePickMetrics(
  pick: PickRow,
  pricesByCompany: Map<string, PriceRow[]>,
  spyPrices: PriceRow[],
): PickMetrics {
  const today = todayUtcIsoDate()
  const tickerPrices = pricesByCompany.get(pick.company_id) ?? []

  // Mark: exit price if closed, else latest close on or before today.
  let mark: number | null = null
  let markDate: string | null = null
  if (pick.status === 'closed' && pick.exit_price !== null) {
    mark = pick.exit_price
    markDate = pick.exit_date ?? today
  } else if (tickerPrices.length > 0) {
    // tickerPrices is sorted desc; the first row is the latest.
    mark = tickerPrices[0].close
    markDate = tickerPrices[0].date
  }

  const sign = pick.recommendation === 'short' ? -1 : 1
  const returnPct =
    mark !== null && pick.entry_price > 0
      ? (sign * (mark - pick.entry_price) * 100) / pick.entry_price
      : null

  const refDate = markDate ?? today
  const days = daysBetween(pick.entry_date, refDate)
  const annualized =
    returnPct !== null && days > 0
      ? (Math.pow(1 + returnPct / 100, 365 / days) - 1) * 100
      : returnPct

  // Alpha vs SPY over the same period.
  let alpha: number | null = null
  const spyAtEntry = closeOnOrBefore(spyPrices, pick.entry_date)
  const spyAtMark = closeOnOrBefore(spyPrices, refDate)
  if (
    returnPct !== null &&
    spyAtEntry !== null &&
    spyAtMark !== null &&
    spyAtEntry > 0
  ) {
    const spyReturn = ((spyAtMark - spyAtEntry) * 100) / spyAtEntry
    alpha = returnPct - spyReturn
  }

  let hitTarget: boolean | null = null
  if (mark !== null && pick.target_price !== null) {
    hitTarget =
      pick.recommendation === 'short'
        ? mark <= pick.target_price
        : mark >= pick.target_price
  }

  return {
    mark_price: mark,
    mark_date: markDate,
    return_pct: returnPct,
    days_held: days,
    annualized_return_pct: annualized,
    alpha_vs_spy_pct: alpha,
    hit_target: hitTarget,
  }
}

// ---------- portfolio metrics ----------

export function computePortfolioMetrics(
  picks: PickRow[],
  metricsByPick: Map<string, PickMetrics>,
): PortfolioMetrics {
  const returns: number[] = []
  const alphas: number[] = []
  const days: number[] = []
  for (const p of picks) {
    const m = metricsByPick.get(p.id)
    if (!m) continue
    if (m.return_pct !== null) returns.push(m.return_pct)
    if (m.alpha_vs_spy_pct !== null) alphas.push(m.alpha_vs_spy_pct)
    days.push(m.days_held)
  }

  const winners = returns.filter((r) => r > 0)
  const losers = returns.filter((r) => r < 0)

  return {
    total_picks: picks.length,
    open_picks: picks.filter((p) => p.status === 'open').length,
    closed_picks: picks.filter((p) => p.status === 'closed').length,
    win_rate_pct:
      returns.length > 0 ? (winners.length * 100) / returns.length : null,
    avg_return_pct: average(returns),
    median_return_pct: median(returns),
    best_return_pct: returns.length > 0 ? Math.max(...returns) : null,
    worst_return_pct: returns.length > 0 ? Math.min(...returns) : null,
    avg_alpha_vs_spy_pct: average(alphas),
    avg_days_held: average(days),
    avg_winner_pct: average(winners),
    avg_loser_pct: average(losers),
  }
}
