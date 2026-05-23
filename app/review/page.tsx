import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Review',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type DraftCompany = { ticker: string; name: string } | null

export default async function ReviewQueuePage() {
  const { data: drafts } = await supabase
    .from('writeups')
    .select(
      `id, title, type, published_at,
       companies(ticker, name)`,
    )
    .is('published_at', null)
    .order('id', { ascending: false })

  type Row = {
    id: string
    title: string
    type: string | null
    companies: DraftCompany | DraftCompany[]
  }
  const rows = (drafts as Row[] | null ?? []).map((d) => {
    const c = Array.isArray(d.companies) ? d.companies[0] : d.companies
    return {
      id: d.id,
      title: d.title,
      type: d.type ?? 'Note',
      ticker: c?.ticker ?? '?',
      name: c?.name ?? '?',
    }
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Review queue
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        Review
      </h2>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
        Drafts the firm has pushed and the PM has cleared. Publish to make the
        note public and add the ticker to the tracked portfolio at the latest
        close; reject to delete the draft.
      </p>

      {rows.length === 0 ? (
        <p className="mt-16 text-[15px] italic text-ink-mute">
          No drafts awaiting review. The next /daily-tick may produce more.
        </p>
      ) : (
        <ul className="mt-12 space-y-3">
          {rows.map((d) => (
            <li key={d.id}>
              <Link
                href={`/review/${d.id}`}
                className="block border border-divider bg-paper-dim/30 p-5 transition-colors hover:border-accent hover:bg-paper-dim"
              >
                <div className="flex items-baseline justify-between gap-x-4">
                  <p className="font-display text-lg tracking-tight">
                    {d.ticker}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-ink-soft">
                    {d.type}
                  </p>
                </div>
                <p className="mt-2 text-[15px] leading-snug">{d.title}</p>
                <p className="mt-2 text-[12px] text-ink-mute">{d.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
