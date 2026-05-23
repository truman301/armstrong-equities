import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function HomePage() {
  const { data: sector } = await supabase
    .from('sectors')
    .select('id, name, slug, description')
    .eq('slug', 'sports-betting-igaming')
    .single()

  const { data: companies } = await supabase
    .from('companies')
    .select('ticker, name')
    .eq('sector_id', sector?.id ?? '')
    .order('ticker')

  const { data: latest } = await supabase
    .from('writeups')
    .select('id, title')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Latest PM-written end-of-tick desk note.
  const { data: latestDesk } = await supabase
    .from('firm_ticks')
    .select('tick_number, tick_date, summary')
    .not('summary', 'is', null)
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {latestDesk?.summary && (
        <section className="mb-20 border-b border-divider pb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
              From the desk · Tick {latestDesk.tick_number}
            </p>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink-soft">
              {fmtDate(latestDesk.tick_date)}
            </p>
          </div>
          <article className="writeup mt-6 text-[17px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {latestDesk.summary}
            </ReactMarkdown>
          </article>
          <Link
            href="/desk"
            className="mt-8 inline-block text-[11px] uppercase tracking-[0.25em] text-ink-mute hover:text-accent"
          >
            Past desk notes →
          </Link>
        </section>
      )}

      <section className="mb-20">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          From the editor
        </p>
        <div className="mt-6 space-y-5 text-[19px] leading-[1.65] text-ink">
          <p>
            Armstrong Equities is a one-analyst equity research operation focused on
            narrow sector coverage done at institutional depth. The current focus is
            sports betting and iGaming, the operators and B2B suppliers repricing as
            US online wagering scales toward sustained profitability.
          </p>
          <p>
            Each name is covered through the buy-side initiation framework: a variant
            view against consensus, a dated catalyst, an invalidation criterion, and a
            paired hedge where one fits. Theses are refreshed after every earnings
            print, stress-tested each weekend, and killed without ceremony when the
            evidence changes.
          </p>
          <p className="font-display italic text-ink-mute pt-2">
            Truman Armstrong
          </p>
        </div>
      </section>

      <section className="border-t border-divider pt-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Currently covering
        </p>
        {sector && (
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            <Link href="/sectors" className="hover:text-accent transition-colors">
              {sector.name}
            </Link>
          </h2>
        )}
        {companies && companies.length > 0 && (
          <p className="mt-5 font-mono text-sm text-ink">
            {companies.map((c) => c.ticker).join('    ·    ')}
          </p>
        )}
        {sector?.description && (
          <p className="mt-5 text-[17px] leading-relaxed text-ink">
            {sector.description}
          </p>
        )}
        <Link
          href="/sectors"
          className="mt-8 inline-block text-sm text-accent underline decoration-from-font underline-offset-[6px] hover:no-underline"
        >
          See full coverage &rarr;
        </Link>
      </section>

      <section className="mt-20 border-t border-divider pt-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Latest
        </p>
        {latest ? (
          <p className="mt-5 text-[17px] leading-relaxed text-ink">
            <Link
              href={`/research/${latest.id}`}
              className="text-accent underline decoration-from-font underline-offset-[6px] hover:no-underline"
            >
              {latest.title}
            </Link>
          </p>
        ) : (
          <p className="mt-5 text-[17px] text-ink-mute italic">
            Published notes appear here as the research pipeline clears them. The
            archive opens when the work is ready, not before.
          </p>
        )}
      </section>
    </div>
  )
}
