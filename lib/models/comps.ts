/**
 * Comparable-companies (comps) valuation.
 *
 * For each company: its trading multiples, the peer-group median multiples
 * (excluding the company itself), and an implied share price from applying
 * the peer medians to the company's own metrics.
 *
 * Uses EV/EBITDA and EV/Sales, the standard pair for sports-betting and
 * iGaming operators, where reported earnings are often near zero or negative
 * and P/E is uninformative. EV/Sales is defined for every name; EV/EBITDA is
 * used only where EBITDA is positive, so an unprofitable peer never pollutes
 * the EBITDA median or yields a nonsense implied price.
 */

export interface CompInput {
  ticker: string
  price: number
  ebitda: number
  revenue: number
  netDebt: number
  sharesOutstanding: number
}

export interface CompResult {
  ticker: string
  marketCap: number
  enterpriseValue: number
  evEbitda: number | null
  evSales: number | null
  peerMedianEvEbitda: number | null
  peerMedianEvSales: number | null
  impliedPriceEvEbitda: number | null
  impliedPriceEvSales: number | null
  impliedPriceMedian: number | null
  impliedUpside: number | null
}

function median(values: number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 === 0 ? (xs[mid - 1] + xs[mid]) / 2 : xs[mid]
}

// Bridge an implied enterprise value to an implied per-share equity price.
function impliedPrice(
  peerMultiple: number | null,
  ownMetric: number,
  netDebt: number,
  shares: number,
): number | null {
  if (peerMultiple === null || ownMetric <= 0 || shares <= 0) return null
  return (peerMultiple * ownMetric - netDebt) / shares
}

export function computeComps(companies: CompInput[]): CompResult[] {
  const base = companies.map((c) => {
    const marketCap = c.price * c.sharesOutstanding
    const enterpriseValue = marketCap + c.netDebt
    return {
      input: c,
      marketCap,
      enterpriseValue,
      evEbitda:
        c.ebitda > 0 && enterpriseValue > 0 ? enterpriseValue / c.ebitda : null,
      evSales:
        c.revenue > 0 && enterpriseValue > 0
          ? enterpriseValue / c.revenue
          : null,
    }
  })

  return base.map((self) => {
    const peers = base.filter((p) => p.input.ticker !== self.input.ticker)
    const { input } = self

    const peerMedianEvEbitda = median(
      peers.map((p) => p.evEbitda).filter((v): v is number => v !== null),
    )
    const peerMedianEvSales = median(
      peers.map((p) => p.evSales).filter((v): v is number => v !== null),
    )

    const impliedPriceEvEbitda = impliedPrice(
      peerMedianEvEbitda,
      input.ebitda,
      input.netDebt,
      input.sharesOutstanding,
    )
    const impliedPriceEvSales = impliedPrice(
      peerMedianEvSales,
      input.revenue,
      input.netDebt,
      input.sharesOutstanding,
    )

    const impliedPriceMedian = median(
      [impliedPriceEvEbitda, impliedPriceEvSales].filter(
        (v): v is number => v !== null && v > 0,
      ),
    )

    const impliedUpside =
      impliedPriceMedian !== null && input.price > 0
        ? impliedPriceMedian / input.price - 1
        : null

    return {
      ticker: input.ticker,
      marketCap: self.marketCap,
      enterpriseValue: self.enterpriseValue,
      evEbitda: self.evEbitda,
      evSales: self.evSales,
      peerMedianEvEbitda,
      peerMedianEvSales,
      impliedPriceEvEbitda,
      impliedPriceEvSales,
      impliedPriceMedian,
      impliedUpside,
    }
  })
}
