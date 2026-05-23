import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notFound, redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ReviewActions from './actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Review draft',
}

type DraftCompany = { ticker: string; name: string } | null

export default async function ReviewDraftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: draft } = await supabase
    .from('writeups')
    .select(
      `id, title, type, body_markdown, published_at,
       companies(ticker, name)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!draft) notFound()

  // Already-published drafts: send the user to the public note instead.
  if (draft.published_at) {
    redirect(`/research/${id}`)
  }

  type Row = typeof draft & {
    companies: DraftCompany | DraftCompany[]
  }
  const d = draft as Row
  const c = Array.isArray(d.companies) ? d.companies[0] : d.companies
  const ticker = c?.ticker ?? '?'
  const name = c?.name ?? '?'

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/review"
        className="text-[11px] uppercase tracking-[0.3em] text-ink-mute hover:text-accent"
      >
        ← Review queue
      </Link>

      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          {ticker} · {d.type ?? 'Note'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {d.title}
        </h1>
        <p className="mt-2 text-[15px] text-ink-mute">{name}</p>
      </div>

      <article className="writeup mt-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {d.body_markdown ?? '_(empty draft)_'}
        </ReactMarkdown>
      </article>

      <div className="mt-16 border-t border-divider pt-8">
        <ReviewActions writeupId={d.id} title={d.title} ticker={ticker} />
      </div>
    </div>
  )
}
