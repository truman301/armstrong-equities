import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail, renderBdWeeklyHtml } from '@/lib/email'
import {
  bdWeeklySystemPrompt,
  buildBdWeeklyUserPrompt,
  invokeBd,
  type BdContext,
} from '@/lib/bd-agent'
import { getScoreboard } from '@/lib/scoreboard'

// GET /api/cron/bd-weekly -- Friday-afternoon BD weekly wrap.
//
// Pulls the firm's end-of-week scoreboard, the week's published notes,
// and BD's own five (or fewer) daily notes from this week, then asks BD
// to produce the weekly wrap. Persists to bd_notes and emails Truman.
//
// Authenticated with CRON_SECRET.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
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
  const weekAgo = isoNDaysAgo(6) // Friday week back to last Saturday

  // ---------- Build weekly context ----------
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
    .limit(10)
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

  const { data: dailies } = await supabase
    .from('bd_notes')
    .select('note_date, content')
    .eq('kind', 'daily')
    .gte('note_date', weekAgo)
    .order('note_date', { ascending: true })
  type DailyRow = { note_date: string; content: string }
  const priorBdDailyNotes =
    ((dailies as DailyRow[] | null) ?? [])
      .map((n) => `--- ${n.note_date} ---\n\n${n.content}`)
      .join('\n\n') || null

  const ctx: BdContext = {
    todayIsoDate: today,
    weekRangeIso: `${weekAgo} to ${today}`,
    scoreboardJson: JSON.stringify(scoreboard, null, 2),
    recentNotesSummary,
    openDraftsSummary,
    latestDeskNote: null,
    priorBdDailyNotes,
  }

  // ---------- Invoke BD ----------
  const result = await invokeBd(
    bdWeeklySystemPrompt(),
    buildBdWeeklyUserPrompt(ctx),
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // ---------- Persist ----------
  const { error: insertErr } = await supabase.from('bd_notes').insert({
    kind: 'weekly',
    note_date: today,
    content: result.content,
  })
  if (insertErr) {
    return NextResponse.json(
      { error: `BD weekly generated but persist failed: ${insertErr.message}` },
      { status: 500 },
    )
  }

  // ---------- Email ----------
  const html = renderBdWeeklyHtml({ weekEndingDate: today, body: result.content })
  const subject = `BD weekly · Week ending ${subjectDate(today)}`
  const mail = await sendEmail(subject, html)
  if (mail.error) {
    return NextResponse.json(
      { error: `BD weekly persisted but email failed: ${mail.error}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    message_id: mail.id,
    note_date: today,
  })
}
