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
      'A tall, refined, dignified mecha. Head: sculpted matte-ivory ceramic, narrow obelisk shape, single vertical centerline visor housing three stacked horizontal lenses (deliberation/judgment), brushed-brass mandible plates. Torso: tall narrow ivory ceramic chest, a tall stand-up collar plate in deep burgundy with a brass clasp at the throat (the pocket-square equivalent). Arms: long, articulated, brushed-brass fingers, one hand resting at the side, the other gesturing slightly forward as if mid-judgment. Legs: slender ivory ceramic with brass-trimmed knee joints, ending in flat brass-edged feet. Posture: upright, still, commanding.',
  },
  {
    slug: 'analyst-gaming',
    cues:
      'A forward-leaning, energetic mecha. Head: polished cream ceramic, asymmetric octahedral shape, single wide horizontal scanning-lens slit glowing soft burgundy, two narrow antenna fins angled forward at the temples like the corners of a die. Torso: compact agile chest plate in deep navy ceramic with a small burgundy triangular emblem. Arms: in motion; one hand holds a translucent holographic playbook tablet, the other gestures forward as if presenting an idea. Legs: athletic, slightly forward stance as if mid-step, brass joint accents. Posture: ready, kinetic.',
  },
  {
    slug: 'associate-gaming',
    cues:
      'A probing, analytical mecha. Head: faceted matte-ivory carapace, asymmetric quad-lens cluster grouped on the right side of the face, a single articulated jeweler’s loupe on a thin brass arm extending from the brow. Torso: deep navy chest plate with faint burgundy diagnostic line patterns etched along the seams. Arms: detailed mechanical fingers; one hand holds a small magnifier or scanner tool up to the eye level, the other holds an open translucent stress-test panel with abstract markings. Legs: planted, slightly bent. Posture: head tilted forward, examining.',
  },
  {
    slug: 'analyst-software',
    cues:
      'A precise, geometric mecha. Head: hexagonal cream ceramic with a wide horizontal slit revealing layered translucent display glass with faint blue-white edge light. Torso: angular ivory ceramic with translucent circuit traces glowing soft burgundy in fine vertical lines beneath the surface plating, ink-navy collar plate. Arms: slim, articulated, parser-fork digit attachments; one hand projects a small floating holographic data cube, the other rests on a console edge. Legs: even, balanced. Posture: upright, neutral, intent.',
  },
  {
    slug: 'associate-software',
    cues:
      'A critical, methodical mecha. Head: tall narrow ivory ceramic with sectioned plating partially open to reveal exposed brass gears and circuit substrate beneath, two narrow vertical visor slits stacked on the faceplate both glowing soft burgundy. Torso: ivory chest with subtle burgundy fault-indicator dots etched across the plating. Arms: articulated, ending in delicate tweezer and probe attachments; one arm holds a debugging probe tool extended, the other points down as if calling out a fault. Legs: planted, slightly hunched. Posture: methodical, analytical.',
  },
  {
    slug: 'business-development',
    cues:
      'A presence-forward, commercial mecha. Head: hemispherical ivory ceramic crown with a single wide rectangular visor across the front displaying soft warm amber light. Torso: sturdy chassis in cream ceramic with brushed-brass shoulder pauldrons and a brass chest-plate, a small burgundy lapel emblem on the upper chest. Arms: confident posture; one articulated hand gesturing forward open-palmed as if making a closing point, the other carrying a slim translucent pitch-deck panel under the arm. Legs: planted firmly, slight forward lean. Posture: alert, persuasive, slightly larger frame than the others (the commercial presence).',
  },
]

const STYLE_PREFIX = `Editorial illustration of a futuristic ROBOT character, FULL BODY standing pose (head to feet fully visible), centered in frame with empty space around the figure, photographed against a PURE TRANSPARENT BACKGROUND. The design is ORIGINAL mecha, not derivative of any existing robot in film, video games, or animation (not Star Wars, not Wall-E, not Transformers, not Pixar, not anime, not Boston Dynamics). Editorial NYT-magazine illustration tone, deliberate, refined, calm. Ivory ceramic chassis tones with deep ink-navy structural elements (#1a1f2e) and subtle burgundy red accents (#8b2b2d), brushed brass fittings. Soft directional lighting from the front-left, soft cast shadow beneath the feet for grounding. No text, letters, numbers, logos, or legible writing anywhere in the image.

The robot:`

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
      background: 'transparent',
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
  console.log(`Generating ${AGENTS.length} avatars (paced to stay under the 5/min input-image limit)...`)
  // Stagger by 13s per agent: under the 5-per-minute cap and well within
  // gpt-image-1's typical 30-60s generation window, so we don't actually
  // slow the overall wall-clock by much.
  const results = await Promise.allSettled(
    AGENTS.map(
      (a, i) =>
        new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            generate(a).then(resolve).catch(reject)
          }, i * 13_000)
        }),
    ),
  )
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
