import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/format'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabase
    .from('writeups')
    .select('title')
    .eq('id', id)
    .maybeSingle()
  return { title: data?.title ?? 'Research' }
}

export default async function WriteupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // The published_at filter enforces the review gate: a draft is not
  // viewable by URL until Truman publishes it.
  const { data: writeup } = await supabase
    .from('writeups')
    .select('id, type, title, body_markdown, published_at, companies(ticker)')
    .eq('id', id)
    .not('published_at', 'is', null)
    .maybeSingle()

  if (!writeup) notFound()

  const company = Array.isArray(writeup.companies)
    ? writeup.companies[0]
    : writeup.companies

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/research"
        className="text-[11px] uppercase tracking-[0.3em] text-ink-mute hover:text-accent transition-colors"
      >
        &larr; Research
      </Link>

      <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-ink-mute">
        {company?.ticker} &middot; {writeup.type} &middot;{' '}
        {formatDate(writeup.published_at)}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight">
        {writeup.title}
      </h1>

      <div className="writeup mt-10">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {writeup.body_markdown ?? ''}
        </ReactMarkdown>
      </div>
    </article>
  )
}
