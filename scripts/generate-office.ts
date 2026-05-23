/**
 * One-off: generate the office-floor BACKGROUND illustration via OpenAI's
 * gpt-image-1 and save to public/office-floor.png. The room is intentionally
 * empty of people; the agent avatars are generated separately and positioned
 * on top with code, so they can be animated.
 *
 * Run from the repo root:
 *   npx tsx scripts/generate-office.ts
 */
import { config as loadDotenv } from 'dotenv'
import { writeFileSync } from 'node:fs'

loadDotenv({ path: '.env.local' })

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('OPENAI_API_KEY not set in .env.local')
  process.exit(1)
}

const PROMPT = `A wide isometric illustration of a small editorial-style equity research office, viewed from a slightly elevated three-quarter top-down angle. Warm cream walls and floor (#f4f1ea), deep ink-navy furniture (#1a1f2e), with burgundy red accents (#8b2b2d) and soft beige dividers (#d4cfc4).

The room contains five distinct desks: one central, slightly elevated desk that is clearly the most prominent (the PM's), two desks on the left side (a Gaming pod), and two desks on the right side (a Software pod). Each desk has a laptop, a small stack of papers, and a desk lamp.

The room also has: tall windows on the back wall letting in soft golden afternoon light; a corner with a printer and a small filing cabinet; a small coffee station with an espresso machine; a side meeting nook with two chairs around a low coffee table; an abstract market-data display on one wall showing minimalist line charts (no numbers, no text); and a framed printed document on another wall.

Important: the room is EMPTY of occupants. No people, figures, characters, or human silhouettes anywhere. Just the office and its fixtures.

Clean architectural lines, NYT-magazine illustration tone, deliberate, calm, and serious. No text, letters, numbers, or legible writing anywhere in the image.`

interface ImageResponse {
  data?: Array<{ b64_json?: string }>
  error?: { message?: string }
}

async function main() {
  console.log('Calling OpenAI gpt-image-1 (this typically takes 30-60s)...')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: PROMPT,
      size: '1536x1024',
      quality: 'high',
      n: 1,
    }),
  })

  const data = (await res.json()) as ImageResponse

  if (!res.ok || data.error) {
    console.error(`OpenAI HTTP ${res.status}:`, JSON.stringify(data, null, 2))
    process.exit(1)
  }

  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    console.error('No b64_json in OpenAI response:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  const buf = Buffer.from(b64, 'base64')
  writeFileSync('public/office-floor.png', buf)
  console.log(`Saved ${buf.byteLength.toLocaleString()} bytes to public/office-floor.png`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
