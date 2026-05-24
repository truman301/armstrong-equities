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

const PROMPT = `A wide editorial illustration of the empty operations deck of a futuristic research vessel, viewed from a slightly elevated angle looking forward toward the viewport. Warm sci-fi (not cold or industrial); think Pullman dining car crossed with a starship bridge. Palette: cream and ivory base (#f4f1ea), deep ink-navy structural panels (#1a1f2e), burgundy accents (#8b2b2d), brushed brass fittings, soft warm uplighting.

Architecture: a domed deck with curved ribbed ceiling. The back wall is a single wide curved panoramic viewport showing a soft golden dawn-lit nebula and distant stars (subtle, atmospheric, painterly, not garish). Polished cream stone floor with inlaid burgundy geometric trim along the edges.

Layout: ONE central command workstation on a slightly elevated platform directly in front of the viewport, with a horseshoe console of translucent display panels and a high-backed ergonomic chair, soft burgundy ambient glow from its screens. TWO workstations on the LEFT side of the deck, arranged front-to-back, each with a curved holographic console, exposed brass cable conduits, a personal viewscreen, and a low ergonomic chair. TWO MORE workstations on the RIGHT side, mirroring the left.

Perimeter: brass-trimmed wall consoles, a refreshment alcove with translucent crystal carafes, a small briefing pod with a circular table and three chairs in one corner, abstract flowing data ribbons set into the ceiling beams (minimalist line graphics only, no text, no numbers).

Important: the deck is COMPLETELY EMPTY of any occupants. No people, no robots, no humanoid figures, no silhouettes, no characters of any kind. Only the empty workstations, fixtures, and architecture.

Tone: editorial, refined, warm, intentional. Original design language; not Star Trek, not Star Wars, not Mass Effect, not Apple Store, not generic Hollywood spaceship. NYT-magazine illustration quality. No text, letters, numbers, logos, or legible writing anywhere in the image.`

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
