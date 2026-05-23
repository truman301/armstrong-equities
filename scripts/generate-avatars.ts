/**
 * Generate the five existing-agent portrait avatars in parallel via OpenAI
 * gpt-image-1, save to public/avatars/<slug>.png. Editorial portraits in the
 * site's palette, sized for display as circular medallions on the office floor.
 *
 * Run from the repo root:
 *   npx tsx scripts/generate-avatars.ts
 */
import { config as loadDotenv } from 'dotenv'
import { writeFileSync, mkdirSync } from 'node:fs'

loadDotenv({ path: '.env.local' })

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('OPENAI_API_KEY not set in .env.local')
  process.exit(1)
}

interface Agent {
  slug: string
  cues: string
}

const AGENTS: Agent[] = [
  {
    slug: 'portfolio-manager',
    cues:
      'a senior figure with calm authority, gray-streaked hair, wearing a charcoal blazer with a burgundy pocket square',
  },
  {
    slug: 'analyst-gaming',
    cues:
      'a mid-career figure with focused intent, dark hair, wearing a navy button-down with sleeves rolled up, a small subtle sports-pennant lapel pin',
  },
  {
    slug: 'associate-gaming',
    cues:
      'a mid-career figure with analytical posture, hair tied back, wearing a navy crewneck sweater, reading glasses pushed up on the forehead',
  },
  {
    slug: 'analyst-software',
    cues:
      'a mid-career figure with focused intent, light hair, wearing a navy oxford shirt, fine-frame glasses, a small abstract cloud-icon lapel pin',
  },
  {
    slug: 'associate-software',
    cues:
      'a mid-career figure with analytical posture, dark hair, wearing a charcoal turtleneck, holding a printed document',
  },
]

const STYLE_PREFIX = `Editorial portrait illustration of a single person, head and shoulders, NYT-magazine illustration tone, deliberate and calm. Warm cream background (#f4f1ea), deep ink-navy clothing (#1a1f2e) with subtle burgundy red accents (#8b2b2d). Clean architectural lines. No text, letters, numbers, or legible writing anywhere in the image.

The figure:`

interface ImageResponse {
  data?: Array<{ b64_json?: string }>
  error?: { message?: string }
}

async function generate(agent: Agent): Promise<void> {
  const prompt = `${STYLE_PREFIX} ${agent.cues}.`

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    }),
  })

  const data = (await res.json()) as ImageResponse
  if (!res.ok || data.error) {
    throw new Error(
      `OpenAI HTTP ${res.status} for ${agent.slug}: ${JSON.stringify(data).slice(0, 300)}`,
    )
  }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error(`No b64_json for ${agent.slug}`)
  const buf = Buffer.from(b64, 'base64')
  writeFileSync(`public/avatars/${agent.slug}.png`, buf)
  console.log(`  ${agent.slug}: ${buf.byteLength.toLocaleString()} bytes`)
}

async function main() {
  mkdirSync('public/avatars', { recursive: true })
  console.log(`Generating ${AGENTS.length} avatars in parallel...`)
  const results = await Promise.allSettled(AGENTS.map(generate))
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`${failed.length} of ${AGENTS.length} failed:`)
    for (const r of failed) {
      if (r.status === 'rejected') console.error('  ', r.reason)
    }
    process.exit(1)
  }
  console.log('All avatars generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
