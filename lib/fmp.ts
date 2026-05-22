/**
 * Financial Modeling Prep (FMP) stable API wrapper.
 *
 * FMP_API_KEY is read at call time inside each function, so this module works
 * from both the Next.js runtime and standalone tsx scripts that load
 * .env.local in their own entry point.
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable'

function fmpKey(): string {
  const key = process.env.FMP_API_KEY
  if (!key) throw new Error('FMP_API_KEY is not set')
  return key
}

async function fmpGet<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const qs = new URLSearchParams({ ...params, apikey: fmpKey() })
  const res = await fetch(`${FMP_BASE}/${endpoint}?${qs}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`FMP ${endpoint} HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

/** One daily end-of-day price row. */
export interface FmpDailyPrice {
  date: string
  close: number
  volume: number
}

/** Historical end-of-day prices for a symbol, inclusive of both date bounds. */
export async function fetchDailyPrices(
  symbol: string,
  from: string,
  to: string,
): Promise<FmpDailyPrice[]> {
  const rows = await fmpGet<FmpDailyPrice[]>('historical-price-eod/full', {
    symbol,
    from,
    to,
  })
  if (!Array.isArray(rows)) {
    throw new Error(`FMP historical-price-eod ${symbol}: unexpected shape`)
  }
  return rows
}

/**
 * Live quote. The stable quote omits shares outstanding; callers derive it as
 * marketCap / price.
 */
export interface FmpQuote {
  symbol: string
  price: number
  marketCap: number
  exchange: string
}

export async function fetchQuote(symbol: string): Promise<FmpQuote | null> {
  const rows = await fmpGet<FmpQuote[]>('quote', { symbol })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/**
 * Key metrics for the latest reported period. evToEBITDA and evToSales, with
 * enterpriseValue and marketCap, are enough to back out EBITDA, revenue, and
 * net debt for the comps model.
 */
export interface FmpKeyMetrics {
  symbol: string
  date: string
  period: string
  marketCap: number
  enterpriseValue: number
  evToEBITDA: number
  evToSales: number
}

export async function fetchKeyMetrics(
  symbol: string,
): Promise<FmpKeyMetrics | null> {
  const rows = await fmpGet<FmpKeyMetrics[]>('key-metrics', {
    symbol,
    limit: '1',
  })
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}
