// Email rendering for Armstrong Equities. The daily digest and draft-landed
// ping are both built here. HTML is hand-written using table-based layout
// so it renders consistently in Gmail, Apple Mail, Outlook, and the rest.
//
// The PM writes a structured letter (Top line / Pipeline / Read / Watching)
// per the doctrine in the firm's portfolio-manager.md. This module parses
// those H2 sections and renders each with its own visual treatment.

import { Resend } from 'resend'

const RECIPIENT = 'truman301@gmail.com'
const FROM = 'Armstrong Equities <onboarding@resend.dev>'
const SITE_URL = 'https://www.armstrongequities.com'

// Theme tokens (mirror the site's globals.css).
const C_PAPER = '#f4f1ea'
const C_PAPER_DIM = '#ebe6d9'
const C_INK = '#1a1f2e'
const C_INK_MUTE = '#6b6760'
const C_INK_SOFT = '#9a958b'
const C_ACCENT = '#8b2b2d'
const C_DIVIDER = '#d4cfc4'

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

// ---------- string helpers ----------

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

// Run AFTER escape(). Renders bold/italic/inline-newline within an
// already-escaped string. Doesn't touch HTML structure.
function renderInline(escapedText: string): string {
  return escapedText
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C_INK};font-weight:600;">$1</strong>`)
    .replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

function renderParagraphs(md: string, fontSize = 16, color = C_INK): string {
  return md
    .split(/\n\s*\n/)
    .map((p) => {
      const t = p.trim()
      if (!t) return ''
      return `<p style="font-size:${fontSize}px;line-height:1.7;color:${color};margin:0 0 14px;">${renderInline(escape(t))}</p>`
    })
    .filter(Boolean)
    .join('')
}

function sectionHeading(title: string): string {
  return `<p style="font-family:Georgia,serif;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:${C_INK_SOFT};font-weight:600;margin:0 0 14px;">${escape(title)}</p>`
}

// ---------- letter parser + section renderers ----------

interface LetterPieces {
  greeting: string | null
  sections: Array<{ title: string; body: string }>
  signoff: string | null
}

function parseLetter(md: string): LetterPieces {
  let body = md.trim()

  // Extract the "The desk" sign-off if present at the end.
  let signoff: string | null = null
  const signoffRegex = /\n+(?:\*\*)?\s*The desk\s*(?:\*\*)?\s*$/i
  const signoffMatch = body.match(signoffRegex)
  if (signoffMatch && typeof signoffMatch.index === 'number') {
    signoff = 'The desk'
    body = body.slice(0, signoffMatch.index).trim()
  }

  // No H2 sections -> single chunk, no greeting.
  if (!/^## .+$/m.test(body)) {
    return { greeting: null, sections: [{ title: '', body }], signoff }
  }

  const parts = body.split(/^## (.+?)$/m)
  const greeting = parts[0]?.trim() || null
  const sections: Array<{ title: string; body: string }> = []
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ title: parts[i].trim(), body: (parts[i + 1] ?? '').trim() })
  }
  return { greeting, sections, signoff }
}

function renderTopLine(body: string): string {
  // Pull-quote treatment with accent border. No section heading; the
  // visual treatment IS the heading.
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
      <tr>
        <td style="border-left:3px solid ${C_ACCENT};padding:2px 0 2px 20px;">
          ${renderParagraphs(body, 17, C_INK)}
        </td>
      </tr>
    </table>`
}

function renderWatching(body: string): string {
  const items = body
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•·]\s*/, '').trim())
    .filter(Boolean)
  const rows = items
    .map(
      (it) => `
        <tr>
          <td valign="top" style="padding:6px 0;font-size:15px;line-height:1.55;color:${C_INK};">
            <span style="color:${C_ACCENT};margin-right:12px;font-weight:600;">·</span>${renderInline(escape(it))}
          </td>
        </tr>`,
    )
    .join('')
  return `
    ${sectionHeading('Watching')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
      ${rows}
    </table>`
}

function renderGenericSection(title: string, body: string): string {
  return `
    ${sectionHeading(title)}
    <div style="margin:0 0 36px;">
      ${renderParagraphs(body)}
    </div>`
}

function renderLetter(md: string): string {
  const { greeting, sections, signoff } = parseLetter(md)

  let html = ''
  if (greeting) {
    html += `<p style="font-size:16px;line-height:1.7;color:${C_INK};margin:0 0 32px;">${renderInline(escape(greeting))}</p>`
  }
  for (const s of sections) {
    const lower = s.title.toLowerCase()
    if (lower === 'top line') {
      html += renderTopLine(s.body)
    } else if (lower === 'watching') {
      html += renderWatching(s.body)
    } else if (s.title === '') {
      // Fallback: no sections at all, render as one chunk.
      html += `<div style="margin:0 0 36px;">${renderParagraphs(s.body)}</div>`
    } else {
      html += renderGenericSection(s.title, s.body)
    }
  }
  if (signoff) {
    html += `<p style="margin:40px 0 0;font-family:Georgia,serif;font-style:italic;color:${C_INK_MUTE};font-size:15px;">${escape(signoff)}</p>`
  }
  return html
}

// ---------- shared shell ----------

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C_PAPER};font-family:Georgia,'Times New Roman',serif;color:${C_INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C_PAPER}">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:${C_PAPER};">
          <tr>
            <td>
${inner}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:56px;">
                <tr>
                  <td style="border-top:1px solid ${C_DIVIDER};padding-top:18px;text-align:center;">
                    <p style="font-size:10px;letter-spacing:0.28em;color:${C_INK_SOFT};margin:0;font-family:Georgia,serif;text-transform:uppercase;">
                      Armstrong Equities &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:${C_INK_SOFT};text-decoration:none;">www.armstrongequities.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------- digest ----------

export interface DigestArgs {
  tickNumber: number
  tickDate: string // YYYY-MM-DD
  deskNote: string
  drafts: Array<{ id: string; ticker: string; title: string }>
}

function formatLongDate(tickDate: string): string {
  return new Date(tickDate + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function renderDigestHtml(d: DigestArgs): string {
  const niceDate = formatLongDate(d.tickDate)
  const draftCount = d.drafts.length

  const header = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
      <tr>
        <td style="border-bottom:1px solid ${C_DIVIDER};padding-bottom:20px;">
          <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${C_INK_SOFT};margin:0 0 12px;font-family:Georgia,serif;">
            From the desk &nbsp;·&nbsp; Tick ${d.tickNumber}
          </p>
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:600;margin:0;color:${C_INK};letter-spacing:-0.01em;line-height:1.2;">
            ${escape(niceDate)}
          </h1>
        </td>
      </tr>
    </table>`

  const letter = renderLetter(d.deskNote)

  const draftsBlock =
    draftCount === 0
      ? ''
      : `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:48px;">
      <tr>
        <td style="border-top:1px solid ${C_DIVIDER};padding-top:24px;">
          <p style="font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:${C_INK_SOFT};font-weight:600;margin:0 0 16px;">
            ${draftCount} draft${draftCount === 1 ? '' : 's'} to review
          </p>
        </td>
      </tr>
      ${d.drafts
        .map(
          (dr) => `
        <tr>
          <td style="padding-bottom:10px;">
            <a href="${SITE_URL}/review/${dr.id}" style="display:block;padding:14px 18px;background:${C_PAPER_DIM};text-decoration:none;color:${C_INK};border-left:2px solid ${C_ACCENT};">
              <span style="font-family:Georgia,serif;font-weight:600;font-size:15px;letter-spacing:-0.01em;">${escape(dr.ticker)}</span>
              <span style="color:${C_INK_SOFT};font-size:13px;"> · </span>
              <span style="font-size:14px;color:${C_INK};">${escape(dr.title)}</span>
            </a>
          </td>
        </tr>`,
        )
        .join('')}
    </table>`

  const cta = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:36px auto 0;">
      <tr>
        <td bgcolor="${C_ACCENT}" style="border-radius:28px;">
          <a href="${SITE_URL}/review" style="display:inline-block;padding:14px 36px;color:${C_PAPER};text-decoration:none;text-transform:uppercase;letter-spacing:0.22em;font-size:12px;font-family:Georgia,serif;font-weight:600;">
            Open review queue
          </a>
        </td>
      </tr>
    </table>`

  return shell(
    `Armstrong Equities · Tick ${d.tickNumber}`,
    `${header}${letter}${draftsBlock}${cta}`,
  )
}

// ---------- draft-landed ping ----------

export interface DraftPingArgs {
  id: string
  ticker: string
  title: string
  type: string
}

export function renderDraftPingHtml(d: DraftPingArgs): string {
  const header = `
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${C_INK_SOFT};margin:0 0 12px;font-family:Georgia,serif;">
      New draft &nbsp;·&nbsp; ${escape(d.type)}
    </p>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:600;margin:0 0 8px;color:${C_INK};letter-spacing:-0.01em;line-height:1.2;">
      ${escape(d.ticker)}
    </h1>
    <p style="font-size:17px;line-height:1.55;color:${C_INK};margin:8px 0 32px;">
      ${escape(d.title)}
    </p>`

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
      <tr>
        <td style="border-left:3px solid ${C_ACCENT};padding:2px 0 2px 20px;">
          <p style="font-size:15px;line-height:1.65;color:${C_INK_MUTE};margin:0;">
            The desk just pushed this draft for your review. Open it on the
            site to read the full note and approve or reject.
          </p>
        </td>
      </tr>
    </table>`

  const cta = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
      <tr>
        <td bgcolor="${C_ACCENT}" style="border-radius:28px;">
          <a href="${SITE_URL}/review/${d.id}" style="display:inline-block;padding:14px 36px;color:${C_PAPER};text-decoration:none;text-transform:uppercase;letter-spacing:0.22em;font-size:12px;font-family:Georgia,serif;font-weight:600;">
            Review draft
          </a>
        </td>
      </tr>
    </table>`

  return shell(`New draft: ${d.ticker}`, `${header}${body}${cta}`)
}
