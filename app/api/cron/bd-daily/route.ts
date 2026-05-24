import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail, renderBdDailyHtml } from '@/lib/email'
import {
  bdDailySystemPrompt,
  buildBdDailyUserPrompt,
  invokeBd,
  type BdContext,
} from '@/lib/bd-agent'
import { getScoreboard } from '@/lib/scoreboard'

// GET /api/cron/bd-daily -- weekday afternoon BD daily.
//
// Runs after the firm tick (11:00 UTC) and the PM digest (13:00 UTC) so BD
// has the day's activity to react to. Generates the BD daily note via
// Anthropic, persists it to bd_notes, and emails it to Truman.
//
// Authenticated with CRON_SECRET (same shape as the digest cron).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function subjectDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export async function GET(request: NextRequest): Promise<Response> {
  if (
    request.headers.get('authorization') !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = todayIsoDate()

  // ---------- Build BD daily context ----------
  const scoreboard = await getScoreboard()

  const { data: drafts } = await supabase
    .from('writeups')
    .select('id, title, companies(ticker)')
    .is('published_at', null)
    .order('id', { ascending: false })
  type DraftRow = {
    id: string
    title: string
    companies: { ticker: string } | { ticker: string }[] | null
  }
  const openDraftsSummary =
    ((drafts as DraftRow[] | null) ?? [])
      .map((d) => {
        const c = Array.isArray(d.companies) ? d.companies[0] : d.companies
        return `- ${c?.ticker ?? '?'} · ${d.title}`
      })
      .join('\n') || '(no drafts awaiting review)'

  const { data: recent } = await supabase
    .from('writeups')
    .select('id, title, type, published_at, companies(ticker)')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5)
  type RecentRow = {
    id: string
    title: string
    type: string | null
    published_at: string | null
    companies: { ticker: string } | { ticker: string }[] | null
  }
  const recentNotesSummary =
    ((recent as RecentRow[] | null) ?? [])
      .map((r) => {
        const c = Array.isArray(r.companies) ? r.companies[0] : r.companies
        const date = (r.published_at ?? '').slice(0, 10)
        return `- ${c?.ticker ?? '?'} · ${r.type ?? 'Note'} · ${r.title} (published ${date})`
      })
      .join('\n') || '(no published notes yet)'

  const { data: latestTick } = await supabase
    .from('firm_ticks')
    .select('summary, tick_date')
    .eq('tick_date', today)
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const latestDeskNote = (latestTick?.summary as string | null) ?? null

  const ctx: BdContext = {
    todayIsoDate: today,
    scoreboardJson: JSON.stringify(scoreboard, null, 2),
    recentNotesSummary,
    openDraftsSummary,
    latestDeskNote,
    priorBdDailyNotes: null,
  }

  // ---------- Invoke BD ----------
  const result = await invokeBd(
    bdDailySystemPrompt(),
    buildBdDailyUserPrompt(ctx),
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // ---------- Persist ----------
  const { error: insertErr } = await supabase.from('bd_notes').insert({
    kind: 'daily',
    note_date: today,
    content: result.content,
  })
  if (insertErr) {
    return NextResponse.json(
      { error: `BD generated but persist failed: ${insertErr.message}` },
      { status: 500 },
    )
  }

  // ---------- Email ----------
  const html = renderBdDailyHtml({ noteDate: today, body: result.content })
  const subject = `BD · ${subjectDate(today)} · Commercial state`
  const mail = await sendEmail(subject, html)
  if (mail.error) {
    return NextResponse.json(
      { error: `BD persisted but email failed: ${mail.error}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    message_id: mail.id,
    note_date: today,
  })
}
