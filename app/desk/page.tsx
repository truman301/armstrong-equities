import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'The desk',
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function DeskPage() {
  const { data: ticks } = await supabase
    .from('firm_ticks')
    .select('id, tick_number, tick_date, summary')
    .not('summary', 'is', null)
    .order('tick_number', { ascending: false })

  const notes = ticks ?? []

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        End-of-day notes
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        The desk
      </h2>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
        One note per tick, written by the PM at the close. What moved through
        the pipeline, what was killed, what the PM is watching tomorrow.
      </p>

      {notes.length === 0 ? (
        <p className="mt-16 text-[15px] italic text-ink-mute">
          No desk notes yet. The first one appears here after the next /daily-tick
          completes.
        </p>
      ) : (
        <div className="mt-16 space-y-16">
          {notes.map((n) => (
            <article
              key={n.id}
              className="border-b border-divider pb-12 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
                  Tick {n.tick_number}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                  {fmtDate(n.tick_date)}
                </p>
              </div>
              <div className="writeup mt-6 text-[16px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {n.summary as string}
                </ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
