import { supabase } from '@/lib/supabase'
import { ROLES } from '@/lib/roles'
import AgentsBoard, { type AgentSeat } from '@/components/agents-floor'

export const revalidate = 60

export const metadata = {
  title: 'Agents',
}

const BASE_AGENTS: Array<{
  slug: string
  name: string
  role: string
  sourceRoleSlug: string
}> = [
  {
    slug: 'portfolio-manager',
    name: 'The desk',
    role: 'Portfolio Manager · CIO',
    sourceRoleSlug: 'portfolio-manager',
  },
  {
    slug: 'analyst-gaming',
    name: 'Gaming Analyst',
    role: 'Equity Analyst',
    sourceRoleSlug: 'equity-analyst',
  },
  {
    slug: 'associate-gaming',
    name: 'Gaming Associate',
    role: 'Research Associate',
    sourceRoleSlug: 'research-associate',
  },
  {
    slug: 'analyst-software',
    name: 'Software Analyst',
    role: 'Equity Analyst',
    sourceRoleSlug: 'equity-analyst',
  },
  {
    slug: 'associate-software',
    name: 'Software Associate',
    role: 'Research Associate',
    sourceRoleSlug: 'research-associate',
  },
]

type ActivityRow = {
  status?: string
  current_ticker?: string | null
  verdict?: string | null
}

function seatFor(
  slug: string,
  name: string,
  role: string,
  description: string,
  perAgent: Record<string, ActivityRow>,
): AgentSeat {
  const activity = perAgent[slug] || {}
  const status =
    activity.status === 'building' || activity.status === 'reviewing'
      ? activity.status
      : 'idle'
  return {
    slug,
    name,
    role,
    description,
    status: status as 'idle' | 'building' | 'reviewing',
    currentTicker: activity.current_ticker ?? null,
    pending: false,
  }
}

export default async function AgentsPage() {
  const { data: latestTick } = await supabase
    .from('firm_ticks')
    .select('per_agent')
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const perAgent =
    (latestTick?.per_agent as Record<string, ActivityRow>) ?? {}

  const { data: hires } = await supabase
    .from('proposed_hires')
    .select('id, role_slug, role_name, pitch, description, status, created_at')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: true })

  const lookup = new Map<string, AgentSeat>()
  for (const b of BASE_AGENTS) {
    const role = ROLES.find((r) => r.slug === b.sourceRoleSlug)
    lookup.set(
      b.slug,
      seatFor(b.slug, b.name, b.role, role?.description ?? '', perAgent),
    )
  }

  const pm = lookup.get('portfolio-manager') ?? null
  const gamingPod = {
    analyst: lookup.get('analyst-gaming')!,
    associate: lookup.get('associate-gaming')!,
  }
  const softwarePod = {
    analyst: lookup.get('analyst-software')!,
    associate: lookup.get('associate-software')!,
  }

  const hireSeats: AgentSeat[] = (hires ?? []).map((h) => ({
    slug: `${h.status as string}-${h.id}`,
    name: h.role_name as string,
    role: h.role_name as string,
    description: h.description as string,
    status: 'idle',
    currentTicker: null,
    pending: h.status !== 'active',
  }))

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
        Case study
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight">
        The firm
      </h2>
      <div className="mt-6 max-w-2xl space-y-3 text-[17px] leading-relaxed text-ink-mute">
        <p>
          Armstrong Equities is, under the hood, an AI-operated research firm.
          Five Claude agents at five seats: a Portfolio Manager with sole
          publish or kill authority, and two coverage pods (Gaming and
          Software), each with an Analyst building theses and an Associate
          trying to break them. They run on a weekday schedule on GitHub
          Actions and push their PM-approved notes to this site as drafts.
          Truman gates every publish.
        </p>
        <p>
          Click any seat to read its job description and current activity. Use{' '}
          <strong className="text-ink">New Hire</strong> to add a role.
        </p>
      </div>

      <div className="mt-16">
        <AgentsBoard
          pm={pm}
          gamingPod={gamingPod}
          softwarePod={softwarePod}
          hires={hireSeats}
        />
      </div>
    </div>
  )
}
