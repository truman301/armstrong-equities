// Business Development agent: invokes Claude with the BD system prompt and
// the firm's current commercial context to produce the daily or weekly note.
//
// The BD role definition lives in lib/roles.ts; this file pulls that
// description, wraps it with operating-context for the email format, and
// calls the Anthropic API.

import Anthropic from '@anthropic-ai/sdk'
import { ROLES } from '@/lib/roles'

export const BD_MODEL = 'claude-sonnet-4-5'
export const BD_MAX_TOKENS = 1400

let _client: Anthropic | null = null
function anthropic(): Anthropic {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set on the server.')
  _client = new Anthropic({ apiKey: key })
  return _client
}

function bdRoleDescription(): string {
  const r = ROLES.find((x) => x.slug === 'business-development')
  if (!r) {
    throw new Error('business-development role missing from lib/roles.ts')
  }
  return r.description
}

const FIRM_CONTEXT = `Armstrong Equities is a one-analyst equity-research firm covering Sports Betting & iGaming (Pod G) and Software (Pod S). The Portfolio Manager has sole publish/kill authority. The firm runs a 3-day rolling pipeline. The site /performance carries the live, public track record.`

const HARD_LINES = `
- No fabricated numbers. If the data below does not contain a figure, do not cite one.
- Never use em-dashes. Truman has a strict ban. Use commas, semicolons, parentheses, or rewrite.
- No marketing language. Direct, opinionated, specific.
- No softening. If the commercial clock did not move this period, say so explicitly. That is the whole point of your job.`

export function bdDailySystemPrompt(): string {
  return `${bdRoleDescription()}

${FIRM_CONTEXT}

## Operating context (today)

You are writing your DAILY end-of-day note to Truman. He gets this email every weekday afternoon. It surfaces today's commercial state and pressures him on tomorrow. Length: 200-350 words. Greet "Truman," at the top, sign off with a single bold line **BD** at the bottom.

## Required structure (use these H2 headers exactly so the email template parses them)

\`\`\`
Truman,

## State of the commercial clock
One paragraph. Where do we sit versus the path to first paying reader and first allocator conversation? Is the clock moving or stalled? Quote one specific number from the scoreboard.

## What moved today
What in the firm's activity today, if anything, advanced the commercial story? A published note adds to the track record (commercial event). A clean kill reinforces the bar (commercial event). Be specific with tickers and numbers.

## What did not move
The honest counterweight. What specifically did NOT advance toward the commercial milestones today? Outreach not done, audience list not grown, packet not refreshed.

## Tomorrow
One or two specific actions you want Truman to take tomorrow. Concrete and small enough to actually happen in 15 minutes.

**BD**
\`\`\`

${HARD_LINES}`
}

export function bdWeeklySystemPrompt(): string {
  return `${bdRoleDescription()}

${FIRM_CONTEXT}

## Operating context (this week)

You are writing your WEEKLY wrap to Truman, sent Friday afternoon. This is the larger note: it summarizes the week, names what shipped commercially and what did not, and frames next week. Length: 400-700 words. Greet "Truman," at the top, sign off with a single bold line **BD** at the bottom.

## Required structure (use these H2 headers exactly so the email template parses them)

\`\`\`
Truman,

## The week in one line
One sentence. The headline read of this week from the commercial seat.

## What shipped
Specific things that advanced. Published notes (with tickers), closed picks (with returns), audience or allocator moves. Quote specific numbers from the scoreboard.

## What stalled
Specific things that did NOT advance. Be direct. The standing question you owe Truman every week is: what specifically happened this week to move the firm closer to its first paying reader and first allocator conversation? If the answer is "nothing," say so explicitly.

## Allocator and audience read
Where the firm stands versus the threshold for an Armstrong Capital conversation: track-record length, alpha versus SPY, win rate, named-allocator pipeline. What still needs to be true before the threshold is met.

## Next week's focus
Two or three commercial priorities for next week, each in one line.

**BD**
\`\`\`

${HARD_LINES}`
}

// ---------- context construction ----------

export interface BdContext {
  todayIsoDate: string
  weekRangeIso?: string
  scoreboardJson: string
  recentNotesSummary: string
  openDraftsSummary: string
  latestDeskNote: string | null
  priorBdDailyNotes: string | null
}

export function buildBdDailyUserPrompt(ctx: BdContext): string {
  return `Today is ${ctx.todayIsoDate}. Write your DAILY end-of-day commercial note for Truman.

## Firm scoreboard (just pulled)

\`\`\`json
${ctx.scoreboardJson}
\`\`\`

## Today's PM desk note

${ctx.latestDeskNote ?? '(no desk note from today; PM did not run a tick today, OR the tick has not landed yet)'}

## Drafts awaiting Truman's review

${ctx.openDraftsSummary}

## Recently published notes

${ctx.recentNotesSummary}

Write the daily note per the structure in your system prompt. 200-350 words. No em-dashes. Sign off with a single bold line **BD**.`
}

export function buildBdWeeklyUserPrompt(ctx: BdContext): string {
  return `This week ended ${ctx.todayIsoDate} (${ctx.weekRangeIso ?? 'the past week'}). Write your WEEKLY commercial wrap for Truman.

## Firm scoreboard at end of week

\`\`\`json
${ctx.scoreboardJson}
\`\`\`

## Drafts awaiting Truman's review

${ctx.openDraftsSummary}

## Published notes (this week + recent)

${ctx.recentNotesSummary}

## Your own daily notes from this week (so you do not repeat yourself)

${ctx.priorBdDailyNotes ?? '(no prior dailies recorded this week)'}

Write the weekly wrap per the structure in your system prompt. 400-700 words. No em-dashes. Sign off with a single bold line **BD**.`
}

// ---------- invocation ----------

export async function invokeBd(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const res = await anthropic().messages.create({
      model: BD_MODEL,
      max_tokens: BD_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
    if (!text.trim()) {
      return { ok: false, error: 'Anthropic returned empty content.' }
    }
    return { ok: true, content: text }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
