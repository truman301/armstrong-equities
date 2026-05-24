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
      'a refined, dignified mecha. A sculpted matte-ivory ceramic head shaped like a tall, narrow obelisk with rounded edges. A single vertical visor running down the centerline housing three stacked horizontal lenses (suggesting deliberation and judgment). Brushed-brass mandible plates along the lower jawline. A high collar plate in deep burgundy with a brass clasp at the throat (the equivalent of a pocket square). Subtle filigree etched along the temples. Posture upright and still.',
  },
  {
    slug: 'analyst-gaming',
    cues:
      'a forward-leaning, energetic mecha. A polished cream ceramic chassis with an asymmetric octahedral head. A single wide horizontal scanning-lens slit glowing soft burgundy. Two narrow antenna fins angled forward from the temples like the corners of a die. Thin copper filigree etched into the cheek plates in arc patterns suggesting motion. Shoulder plate visible in a navy ceramic with a small burgundy triangular emblem.',
  },
  {
    slug: 'associate-gaming',
    cues:
      'a probing, analytical mecha. A faceted matte-ivory carapace head with an asymmetric quad-lens cluster grouped on the right side of the face (suggesting skepticism and zoom-in). A single articulated jeweler’s loupe extending from a brow mount on a thin brass arm. Faint burgundy diagnostic line patterns etched along the chassis seams. Tilted head posture. Shoulder plate visible in deep navy.',
  },
  {
    slug: 'analyst-software',
    cues:
      'a precise, geometric mecha. A hexagonal cream ceramic head with a wide horizontal slit revealing layered translucent display glass with faint blue-white edge light (suggesting reading layered information). Translucent circuit traces glowing soft burgundy beneath the surface plating in fine vertical lines. Two slim antenna-forks at the temples (the parsers). Shoulder plate in ink navy with a brass collar.',
  },
  {
    slug: 'associate-software',
    cues:
      'a critical, methodical mecha. A tall narrow ivory ceramic head with sectioned plating partially open in places to reveal exposed brass gears and circuit substrate beneath (suggesting reverse-engineering). Two narrow vertical visor slits stacked on the faceplate, both glowing soft burgundy. Fine articulated arms tucked at the side ending in delicate tweezer and probe attachments. Subtle burgundy fault-indicator dots etched across the chest plate.',
  },
]

const STYLE_PREFIX = `Editorial portrait illustration of a futuristic ROBOT (no human features anywhere, NO eyes, NO mouth, NO skin), head and shoulders, photographed in a warm studio. The design is ORIGINAL mecha, not derivative of any existing robot in film, video games, or animation (not Star Wars, not Wall-E, not Transformers, not Pixar, not anime, not Boston Dynamics). Editorial NYT-magazine illustration tone, deliberate, refined, calm. Warm cream background (#f4f1ea), ivory ceramic chassis tones with deep ink-navy structural elements (#1a1f2e) and subtle burgundy red accents (#8b2b2d). Soft directional lighting from the front-left. No text, letters, numbers, logos, or legible writing anywhere in the image.

The mecha:`

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
