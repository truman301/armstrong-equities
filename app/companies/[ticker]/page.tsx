import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PriceSpark from '@/components/price-spark'
import CompsWidget from '@/components/comps-widget'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params
  return { title: decodeURIComponent(ticker).toUpperCase() }
}

function fmtPrice(v: number, currency: string): string {
  return `${currency === 'GBP' ? '£' : '$'}${v.toFixed(2)}`
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker: raw } = await params
  const ticker = decodeURIComponent(raw).toUpperCase()

  const { data: company } = await supabase
    .from('companies')
    .select(
      'id, ticker, name, exchange, currency, description, website, sector_id',
    )
    .eq('ticker', ticker)
    .maybeSingle()

  if (!company) notFound()

  const currency: string = company.currency ?? 'USD'

  const [sectorRes, pricesRes, compsRes, recRes, writeupsRes] =
    await Promise.all([
      supabase
        .from('sectors')
        .select('name, slug')
        .eq('id', company.sector_id)
        .maybeSingle(),
      supabase
        .from('prices')
        .select('date, close')
        .eq('company_id', company.id)
        .order('date', { ascending: false })
        .limit(260),
      supabase
        .from('comps_results')
        .select(
          'ev_ebitda, ev_sales, peer_median_ev_ebitda, peer_median_ev_sales, implied_price, implied_upside',
        )
        .eq('company_id', company.id)
        .order('run_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('recommendations')
        .select('rating, price_target, thesis_summary, issued_at')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('writeups')
        .select('id, type, title, published_at')
        .eq('company_id', company.id)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false }),
    ])

  const sector = sectorRes.data
  // Prices arrive newest-first; reverse to chronological order for the chart.
  const closes = (pricesRes.data ?? [])
    .slice()
    .reverse()
    .map((p) => p.close as number)
  const comps = compsRes.data
  const rec = recRes.data
  const writeups = writeupsRes.data ?? []

  const latestClose = closes.length > 0 ? closes[closes.length - 1] : null
  const high52 = closes.length > 0 ? Math.max(...closes) : null
  const low52 = closes.length > 0 ? Math.min(...closes) : null

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        {sector ? (
          <Link href="/sectors" className="hover:text-accent transition-colors">
            {sector.name}
          </Link>
        ) : (
          'Coverage'
        )}
      </p>
      <div className="mt-3 flex items-baseline gap-4">
        <h1 className="font-display text-5xl font-semibold tracking-tight">
          {company.ticker}
        </h1>
        <span className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">
          {company.exchange}
        </span>
      </div>
      <p className="mt-2 font-display text-2xl text-ink-mute">{company.name}</p>
      {company.description && (
        <p className="mt-5 text-[17px] leading-relaxed text-ink">
          {company.description}
        </p>
      )}

      <section className="mt-14 border-t border-divider pt-8">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
            Price
          </p>
          {latestClose !== null && (
            <p className="font-mono text-2xl">
              {fmtPrice(latestClose, currency)}
            </p>
          )}
        </div>
        {closes.length > 1 ? (
          <>
            <div className="mt-6">
              <PriceSpark closes={closes} />
            </div>
            <div className="mt-4 flex justify-between font-mono text-[12px] text-ink-mute">
              <span>
                52w low {low52 !== null ? fmtPrice(low52, currency) : '-'}
              </span>
              <span>{closes.length} trading days</span>
              <span>
                52w high {high52 !== null ? fmtPrice(high52, currency) : '-'}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-5 text-[15px] italic text-ink-mute">
            Price history loads after the first data sync.
          </p>
        )}
      </section>

      {rec && (
        <section className="mt-14 border-t border-divider pt-8">
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
            Armstrong Equities rating
          </p>
          <div className="mt-4 flex items-baseline gap-6">
            <span className="font-display text-3xl font-semibold text-accent">
              {rec.rating}
            </span>
            {rec.price_target != null && (
              <span className="font-mono text-lg">
                Target {fmtPrice(rec.price_target as number, currency)}
              </span>
            )}
          </div>
          {rec.thesis_summary && (
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              {rec.thesis_summary}
            </p>
          )}
        </section>
      )}

      <section className="mt-14 border-t border-divider pt-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Peer comps
        </p>
        <CompsWidget comps={comps} currency={currency} />
      </section>

      <section className="mt-14 border-t border-divider pt-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Research
        </p>
        {writeups.length > 0 ? (
          <ul className="mt-4 divide-y divide-divider border-y border-divider">
            {writeups.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/research/${w.id}`}
                  className="group flex items-baseline justify-between gap-4 py-4"
                >
                  <span className="text-[16px] group-hover:text-accent transition-colors">
                    {w.title}
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-ink-mute">
                    {w.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-[15px] italic text-ink-mute">
            No published notes on {company.ticker} yet.
          </p>
        )}
      </section>
    </div>
  )
}
