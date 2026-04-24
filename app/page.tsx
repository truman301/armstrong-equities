import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default async function HomePage() {
  const { data: sector } = await supabase
    .from('sectors')
    .select('name, slug, description')
    .eq('slug', 'medical-technology')
    .single()

  const { data: companies } = await supabase
    .from('companies')
    .select('ticker, name')
    .order('ticker')

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <section className="mb-20">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          From the editor
        </p>
        <div className="mt-6 space-y-5 text-[19px] leading-[1.65] text-ink">
          <p>
            Armstrong Equities is a one-analyst equity research operation focused on
            narrow sector coverage done at institutional depth. The current focus is
            medical technology &mdash; US-listed names across cardiovascular devices,
            diabetes technology, and surgical robotics.
          </p>
          <p>
            Each name is covered through the buy-side initiation framework: a variant
            view against consensus, a dated catalyst, an invalidation criterion, and a
            paired hedge where one fits. Theses are refreshed after every earnings
            print, stress-tested each weekend, and killed without ceremony when the
            evidence changes.
          </p>
          <p className="font-display italic text-ink-mute pt-2">
            &mdash; Truman Armstrong
          </p>
        </div>
      </section>

      <section className="border-t border-divider pt-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
          Currently covering
        </p>
        {sector && (
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            <Link
              href="/sectors"
              className="hover:text-accent transition-colors"
            >
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
        <p className="mt-5 text-[17px] text-ink-mute italic">
          First initiations publish mid-May 2026. The archive opens when the work is
          ready, not before.
        </p>
      </section>
    </div>
  )
}
