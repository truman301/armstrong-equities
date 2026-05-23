// Email helpers, built on Resend. Two senders so far: the daily digest and
// the draft-landed ping. Email HTML is hand-written rather than going through
// react-email so the build stays minimal and the styling stays close to the
// editorial serif theme.

import { Resend } from 'resend'

const RECIPIENT = 'truman301@gmail.com'
const FROM = 'Armstrong Equities <onboarding@resend.dev>'
const SITE_URL = 'https://www.armstrongequities.com'

let _resend: Resend | null = null
function client(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  _resend = new Resend(key)
  return _resend
}

export async function sendEmail(
  subject: string,
  html: string,
): Promise<{ id?: string; error?: string }> {
  try {
    const res = await client().emails.send({
      from: FROM,
      to: RECIPIENT,
      subject,
      html,
    })
    if (res.error) return { error: res.error.message }
    return { id: res.data?.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

// ---------- HTML helpers ----------

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

// Minimal markdown -> HTML for desk notes. Handles paragraph splitting on
// blank lines, **bold**, *italic*, and inline newlines as <br>. Lists and
// headings are not common in PM notes (the doctrine says no rigid headers)
// so we skip them and accept that the rare case looks a hair plain.
function markdownToSimpleHtml(md: string): string {
  return md
    .split(/\n\s*\n/)
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      let html = escape(trimmed)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em>$1</em>')
      html = html.replace(/\n/g, '<br>')
      return `<p style="margin:0 0 1em;">${html}</p>`
    })
    .filter(Boolean)
    .join('')
}

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="background:#f4f1ea;margin:0;padding:24px 16px;font-family:Georgia,'Times New Roman',serif;color:#1a1f2e;">
  <div style="max-width:560px;margin:0 auto;background:#f4f1ea;">
${inner}
    <div style="margin-top:48px;padding-top:16px;border-top:1px solid #d4cfc4;font-size:11px;letter-spacing:0.1em;color:#9a958b;text-align:center;">
      Armstrong Equities · <a href="${SITE_URL}" style="color:#9a958b;text-decoration:underline;">www.armstrongequities.com</a>
    </div>
  </div>
</body></html>`
}

// ---------- digest ----------

export interface DigestArgs {
  tickNumber: number
  tickDate: string // YYYY-MM-DD
  deskNote: string
  drafts: Array<{ id: string; ticker: string; title: string }>
}

export function renderDigestHtml(d: DigestArgs): string {
  const niceDate = new Date(d.tickDate + 'T00:00:00Z').toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )
  const draftCount = d.drafts.length
  const draftsBlock =
    draftCount === 0
      ? ''
      : `
    <div style="margin-top:32px;border-top:1px solid #d4cfc4;padding-top:24px;">
      <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#6b6760;margin:0 0 12px;">Drafts awaiting review</p>
      ${d.drafts
        .map(
          (dr) => `
        <a href="${SITE_URL}/review/${dr.id}" style="display:block;padding:14px 16px;background:#ebe6d9;margin-bottom:8px;text-decoration:none;color:#1a1f2e;border-left:2px solid #8b2b2d;">
          <span style="font-family:Georgia,serif;font-weight:600;font-size:15px;">${escape(dr.ticker)}</span>
          <span style="color:#6b6760;font-size:13px;"> · </span>
          <span style="font-size:14px;">${escape(dr.title)}</span>
        </a>`,
        )
        .join('')}
    </div>`

  const inner = `
    <div style="border-bottom:1px solid #d4cfc4;padding-bottom:16px;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#6b6760;margin:0;">
        From the desk · Tick ${d.tickNumber}
      </p>
      <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:600;margin:10px 0 0;color:#1a1f2e;letter-spacing:-0.01em;">
        ${escape(niceDate)}
      </h1>
    </div>
    ${
      draftCount > 0
        ? `
      <p style="font-size:14px;line-height:1.7;color:#1a1f2e;margin:0 0 24px;">
        <strong>${draftCount} draft${draftCount === 1 ? '' : 's'}</strong> awaiting your review.
      </p>`
        : `
      <p style="font-size:14px;line-height:1.7;color:#6b6760;margin:0 0 24px;font-style:italic;">
        No drafts awaiting review today.
      </p>`
    }
    <article style="font-size:16px;line-height:1.7;color:#1a1f2e;">
      ${markdownToSimpleHtml(d.deskNote)}
    </article>
    ${draftsBlock}
    <div style="margin-top:32px;">
      <a href="${SITE_URL}/review" style="display:inline-block;padding:12px 28px;background:#8b2b2d;color:#f4f1ea;text-decoration:none;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;font-family:Georgia,serif;">
        Open review queue
      </a>
    </div>`
  return shell(`Armstrong Equities · Tick ${d.tickNumber}`, inner)
}

// ---------- draft-landed ping ----------

export interface DraftPingArgs {
  id: string
  ticker: string
  title: string
  type: string
}

export function renderDraftPingHtml(d: DraftPingArgs): string {
  const inner = `
    <div style="margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#6b6760;margin:0;">
        New draft · ${escape(d.type)}
      </p>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:600;margin:12px 0 4px;color:#1a1f2e;letter-spacing:-0.01em;">
        ${escape(d.ticker)}
      </h1>
      <p style="font-size:16px;line-height:1.55;color:#1a1f2e;margin:8px 0 0;">
        ${escape(d.title)}
      </p>
    </div>
    <p style="font-size:14px;line-height:1.7;color:#6b6760;margin:24px 0 32px;">
      The firm just pushed this draft for your review.
    </p>
    <a href="${SITE_URL}/review/${d.id}" style="display:inline-block;padding:12px 28px;background:#8b2b2d;color:#f4f1ea;text-decoration:none;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;font-family:Georgia,serif;">
      Review draft
    </a>`
  return shell(`New draft: ${d.ticker}`, inner)
}
