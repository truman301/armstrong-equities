import { supabase } from '@/lib/supabase'
import { ROLES } from '@/lib/roles'
import AgentsFloor, { type AgentOnFloor } from '@/components/agents-floor'

export const revalidate = 60

export const metadata = {
  title: 'Agents',
}

const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  'portfolio-manager':  { x: 48, y: 46 },
  'analyst-gaming':     { x: 22, y: 46 },
  'associate-gaming':   { x: 22, y: 74 },
  'analyst-software':   { x: 72, y: 46 },
  'associate-software': { x: 68, y: 74 },
}

// Slots for additional desks as the firm grows. Both newly-activated hires
// and any leftover pending rows from before activate-on-click shipped take
// the next free slot in this list.
const EXPANSION_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 78 },
  { x: 88, y: 36 },
  { x: 12, y: 28 },
  { x: 38, y: 26 },
  { x: 62, y: 26 },
  { x: 88, y: 64 },
  { x: 12, y: 62 },
  { x: 50, y: 18 },
  { x: 30, y: 90 },
  { x: 70, y: 90 },
  { x: 88, y: 88 },
  { x: 12, y: 88 },
]

const BASE_AGENTS: Array<{ slug: string; name: string; role: string; sourceRoleSlug: string }> = [
  { slug: 'portfolio-manager',  name: 'Portfolio Manager', role: 'Portfolio Manager / CIO', sourceRoleSlug: 'portfolio-manager' },
  { slug: 'analyst-gaming',     name: 'Gaming Analyst',    role: 'Equity Analyst (Gaming)', sourceRoleSlug: 'equity-analyst' },
  { slug: 'associate-gaming',   name: 'Gaming Associate',  role: 'Research Associate (Gaming)', sourceRoleSlug: 'research-associate' },
  { slug: 'analyst-software',   name: 'Software Analyst',  role: 'Equity Analyst (Software)', sourceRoleSlug: 'equity-analyst' },
  { slug: 'associate-software', name: 'Software Associate',role: 'Research Associate (Software)', sourceRoleSlug: 'research-associate' },
]

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default async function AgentsPage() {
  const { data: latestTick } = await supabase
    .from('firm_ticks')
    .select('per_agent')
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const perAgent =
    (latestTick?.per_agent as Record<
      string,
      { status?: string; current_ticker?: string | null; verdict?: string | null }
    >) ?? {}

  const { data: hires } = await supabase
    .from('proposed_hires')
    .select('id, role_slug, role_name, pitch, description, status, created_at')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: true })

  const baseAgents: AgentOnFloor[] = BASE_AGENTS.map((b) => {
    const activity = perAgent[b.slug] || {}
    const role = ROLES.find((r) => r.slug === b.sourceRoleSlug)
    const status =
      activity.status === 'building' || activity.status === 'reviewing'
        ? activity.status
        : 'idle'
    return {
      slug: b.slug,
      name: b.name,
      role: b.role,
      description: role?.description ?? '',
      avatarSrc: `/avatars/${b.slug}.png`,
      initials: initialsOf(b.name),
      position: AGENT_POSITIONS[b.slug] ?? { x: 50, y: 50 },
      status: status as 'idle' | 'building' | 'reviewing',
      currentTicker: activity.current_ticker ?? null,
      pending: false,
    }
  })

  const hireAgents: AgentOnFloor[] = (hires ?? []).map((h, i) => ({
    slug: `${h.status as string}-${h.id}`,
    name: h.role_name as string,
    role: h.role_name as string,
    description: h.description as string,
    avatarSrc: null,
    initials: initialsOf(h.role_name as string),
    position: EXPANSION_POSITIONS[i % EXPANSION_POSITIONS.length],
    status: 'idle',
    currentTicker: null,
    pending: h.status !== 'active',
  }))

  const agents: AgentOnFloor[] = [...baseAgents, ...hireAgents]

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Case study
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        The floor
      </h2>
      <div className="mt-5 max-w-2xl space-y-3 text-[17px] leading-relaxed text-ink-mute">
        <p>
          Armstrong Equities is, under the hood, an AI-operated research firm.
          Five Claude agents at five desks: a Portfolio Manager who is the only
          seat with publish or kill authority, two coverage pods (Gaming,
          Software), each with an Analyst building theses and an Associate
          trying to break them. They run on a schedule on GitHub Actions and
          push their PM-approved notes to this website as drafts. Truman gates
          every publish.
        </p>
        <p>
          Click any seat to see what they are working on, their deep job
          description, and recent activity. Hit{' '}
          <strong className="text-ink">New Hire</strong> to add a role to the
          firm.
        </p>
      </div>

      <div className="mt-12">
        <AgentsFloor agents={agents} />
      </div>
    </div>
  )
}
