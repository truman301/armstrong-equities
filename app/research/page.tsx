import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/format'

export const revalidate = 3600

export const metadata = {
  title: 'Research',
}

export default async function ResearchPage() {
  const { data: writeups } = await supabase
    .from('writeups')
    .select('id, type, title, published_at, companies(ticker)')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Archive
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Research
      </h2>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-mute">
        Written initiations, coverage updates, and sector notes.
      </p>

      {writeups && writeups.length > 0 ? (
        <ul className="mt-14 divide-y divide-divider border-y border-divider">
          {writeups.map((w) => {
            const company = Array.isArray(w.companies)
              ? w.companies[0]
              : w.companies
            return (
              <li key={w.id}>
                <Link href={`/research/${w.id}`} className="group block py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-ink-mute">
                      {company?.ticker} &middot; {w.type}
                    </span>
                    <span className="font-mono text-[12px] text-ink-mute">
                      {formatDate(w.published_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-2xl tracking-tight group-hover:text-accent transition-colors">
                    {w.title}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-16 border border-divider bg-paper-dim/70 px-8 py-14 text-center">
          <p className="font-display text-2xl italic text-ink">
            The archive is empty for now.
          </p>
          <p className="mt-5 mx-auto max-w-md text-[15px] leading-relaxed text-ink-mute">
            Published notes appear here as the research pipeline clears them.
            Each receives a full framework treatment: variant perception,
            valuation, dated catalysts, and invalidation criteria.
          </p>
        </div>
      )}
    </div>
  )
}
