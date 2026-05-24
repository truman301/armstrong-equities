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

const PROMPT = `A wide editorial illustration of a futuristic equity-research workspace, viewed from a slightly elevated three-quarter angle. The space is warm and architectural, not cold sci-fi. Palette: cream and ivory (#f4f1ea) base, deep ink-navy structural elements (#1a1f2e), burgundy accents (#8b2b2d), soft beige dividers (#d4cfc4).

The room: high vaulted ceilings, a wall of tall arched floor-to-ceiling windows on the back wall letting in soft late-afternoon light, polished cream stone floor with subtle inlaid burgundy geometric patterns, dark walnut and brushed-brass workstations arranged in two clusters (two stations on the left, two on the right) with one central larger workstation slightly elevated. Each station has a translucent holographic display panel floating above it (no text, no legible writing, just abstract minimalist line graphics in a soft glow). Antique brass reading lamps mixed with modern translucent light panels. Subtle exposed cable conduits running along the ceiling beams. A low burgundy chesterfield bench against one side wall. A glass-walled break-out pod in one corner with two facing chairs. An abstract market-data ribbon set into the back wall above the windows (minimalist line charts only, no numbers, no text).

Important: the room is COMPLETELY EMPTY of any occupants. No people, no robots, no humanoid figures, no silhouettes, no characters anywhere. Just the empty futuristic workspace and its fixtures.

Tone: editorial, refined, intentional. Sci-fi but warm. Original design language (not Blade Runner, not Apple Store, not Star Wars, not generic cyberpunk). NYT-magazine illustration quality. No text, letters, numbers, logos, or legible writing anywhere in the image.`

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
