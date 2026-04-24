import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600

export const metadata = {
  title: 'Sectors',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default async function SectorsPage() {
  const { data: sectors } = await supabase
    .from('sectors')
    .select('id, name, slug, description')
    .order('name')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, ticker, name, exchange, currency, sector_id')
    .order('ticker')

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Coverage universe
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Sectors
      </h2>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-mute">
        Narrow sub-sector coverage. One sector at a time, expanded only as theses
        mature.
      </p>

      <div className="mt-16 space-y-16">
        {sectors?.map((s) => {
          const names = companies?.filter((c) => c.sector_id === s.id) ?? []
          return (
            <section key={s.id} className="border-t border-divider pt-10">
              <h3 className="font-display text-3xl font-semibold tracking-tight">
                {s.name}
              </h3>
              {s.description && (
                <p className="mt-4 text-[17px] leading-relaxed text-ink">
                  {s.description}
                </p>
              )}
              {names.length > 0 && (
                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
                    Active coverage &middot; {names.length} {names.length === 1 ? 'name' : 'names'}
                  </p>
                  <ul className="mt-4 divide-y divide-divider border-y border-divider">
                    {names.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-baseline justify-between gap-4 py-4"
                      >
                        <span className="flex items-baseline gap-5">
                          <span className="font-mono text-sm font-semibold w-14">
                            {c.ticker}
                          </span>
                          <span className="text-[16px]">{c.name}</span>
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-ink-mute">
                          {c.exchange}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
