'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ROLES, type Role, type RoleCategory } from '@/lib/roles'

export interface AgentOnFloor {
  slug: string
  name: string
  role: string
  description: string
  avatarSrc: string | null
  initials: string
  position: { x: number; y: number }
  status: 'idle' | 'building' | 'reviewing'
  currentTicker: string | null
  pending: boolean
}

interface Props {
  agents: AgentOnFloor[]
}

export default function AgentsFloor({ agents }: Props) {
  const [openAgent, setOpenAgent] = useState<AgentOnFloor | null>(null)
  const [openNewHire, setOpenNewHire] = useState(false)
  const [drifts, setDrifts] = useState<Record<string, { dx: number; dy: number }>>({})

  // Subtle drift: every 8 seconds, pick a random agent and shift their position
  // by a few percent for a few seconds, then snap back. The CSS transition on
  // left/top makes the move look like a slow walk.
  useEffect(() => {
    if (agents.length === 0) return
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const interval = setInterval(() => {
      const target = agents[Math.floor(Math.random() * agents.length)]
      if (!target) return
      const dx = (Math.random() - 0.5) * 4
      const dy = (Math.random() - 0.5) * 3
      setDrifts((prev) => ({ ...prev, [target.slug]: { dx, dy } }))
      const t = setTimeout(() => {
        setDrifts((prev) => {
          const next = { ...prev }
          delete next[target.slug]
          return next
        })
      }, 6000)
      timeouts.push(t)
    }, 8000)
    return () => {
      clearInterval(interval)
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [agents])

  return (
    <div>
      <div
        className="relative w-full overflow-hidden border border-divider bg-paper-dim"
        style={{ aspectRatio: '1536 / 1024' }}
      >
        <Image
          src="/office-floor.png"
          alt="Armstrong Equities office floor"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1024px"
        />

        {agents.map((agent) => {
          const drift = drifts[agent.slug] ?? { dx: 0, dy: 0 }
          const active =
            agent.status === 'building' || agent.status === 'reviewing'
          const hasFullBody = Boolean(agent.avatarSrc)
          return (
            <button
              key={agent.slug}
              onClick={() => setOpenAgent(agent)}
              className="group absolute"
              style={{
                left: `calc(${agent.position.x}% + ${drift.dx}%)`,
                top: `calc(${agent.position.y}% + ${drift.dy}%)`,
                transition: 'left 4s ease-in-out, top 4s ease-in-out',
                // Full-body figures are anchored at the FEET so the position
                // refers to where they stand on the deck. Circle fallbacks are
                // center-anchored as before.
                transform: hasFullBody
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, -50%)',
              }}
              aria-label={`${agent.role}: ${agent.name}`}
            >
              <div className={`agent-bob ${active ? 'agent-pulse' : ''}`}>
                {hasFullBody ? (
                  <div className="relative h-32 sm:h-44 transition duration-200 group-hover:[filter:drop-shadow(0_0_14px_rgba(255,255,255,0.95))_brightness(1.08)]">
                    <Image
                      src={agent.avatarSrc as string}
                      alt={agent.name}
                      width={220}
                      height={340}
                      className="h-full w-auto object-contain"
                      priority
                    />
                  </div>
                ) : (
                  <div
                    className={`relative h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 shadow-md transition-all duration-200 group-hover:scale-110 group-hover:[box-shadow:0_0_18px_rgba(255,255,255,0.9)] ${
                      agent.pending
                        ? 'border-ink-mute bg-paper-dim'
                        : 'border-accent bg-paper'
                    }`}
                  >
                    <div className="flex h-full w-full items-center justify-center font-display text-sm font-semibold text-ink-mute">
                      {agent.initials}
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`pointer-events-none absolute left-1/2 ${
                  hasFullBody ? 'bottom-full mb-2' : 'top-full mt-2'
                } -translate-x-1/2 whitespace-nowrap rounded bg-ink/90 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-paper opacity-0 transition-opacity group-hover:opacity-100`}
              >
                {agent.pending ? 'pending · ' : ''}
                {agent.role}
              </div>
            </button>
          )
        })}

        <button
          onClick={() => setOpenNewHire(true)}
          className="absolute bottom-4 right-4 rounded-full bg-accent px-5 py-3 font-display text-sm uppercase tracking-[0.2em] text-paper shadow-lg transition-colors hover:bg-ink"
        >
          + New Hire
        </button>
      </div>

      {openAgent && (
        <Modal onClose={() => setOpenAgent(null)}>
          <AgentDetail agent={openAgent} />
        </Modal>
      )}

      {openNewHire && (
        <Modal onClose={() => setOpenNewHire(false)} wide>
          <NewHireFlow onClose={() => setOpenNewHire(false)} />
        </Modal>
      )}
    </div>
  )
}

function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[90vh] overflow-y-auto border border-divider bg-paper shadow-xl ${
          wide ? 'w-full max-w-4xl' : 'w-full max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl leading-none text-ink-mute hover:text-accent"
          aria-label="Close"
        >
          ×
        </button>
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}

function AgentDetail({ agent }: { agent: AgentOnFloor }) {
  const status =
    agent.pending
      ? 'Awaiting activation. The deep job description below would govern this agent if you wire them in.'
      : agent.status === 'building' && agent.currentTicker
        ? `Building the thesis on ${agent.currentTicker}.`
        : agent.status === 'reviewing' && agent.currentTicker
          ? `Reviewing ${agent.currentTicker}.`
          : 'Idle this tick.'

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
        {agent.pending ? 'Pending hire' : 'Agent'}
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {agent.name}
      </h2>
      <p className="mt-1 text-[15px] text-ink-mute">{agent.role}</p>

      <div className="mt-8 border-t border-divider pt-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Currently
        </p>
        <p className="mt-2 text-[16px] leading-relaxed">{status}</p>
      </div>

      <div className="mt-8 border-t border-divider pt-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Job description
        </p>
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          {agent.description}
        </div>
      </div>
    </div>
  )
}

function NewHireFlow({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Role | null>(null)
  const [customDescription, setCustomDescription] = useState<string>('')
  const [hiring, setHiring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byCategory = useMemo(() => {
    const groups: Record<RoleCategory, Role[]> = {
      Research: [],
      Strategy: [],
      Operations: [],
      'Risk & Compliance': [],
    }
    for (const r of ROLES) groups[r.category].push(r)
    return groups
  }, [])

  async function hire() {
    if (!selected) return
    setHiring(true)
    setError(null)
    try {
      const res = await fetch('/api/firm/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_slug: selected.slug,
          description: customDescription.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setHiring(false)
    }
  }

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="text-[11px] uppercase tracking-[0.3em] text-ink-mute hover:text-accent"
        >
          &larr; Roles
        </button>
        <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Hire
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {selected.name}
        </h2>
        <p className="mt-1 text-[15px] text-ink-mute">{selected.pitch}</p>

        <p className="mt-6 border-l-2 border-accent pl-4 text-[13px] leading-relaxed text-ink-mute">
          Activating this role commits{' '}
          <code className="text-ink">.claude/agents/{selected.slug}.md</code> to
          the firm repo on <code className="text-ink">main</code>. The agent is
          real from that point. Non-pipeline roles run on their own cadence;
          pipeline roles (another Analyst or Associate) still need a separate
          orchestrator wiring before the daily tick will invoke them.
        </p>

        <div className="mt-8 border-t border-divider pt-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
            Job description (edit here to customize the prompt before activation)
          </p>
          <textarea
            className="mt-4 h-96 w-full resize-y border border-divider bg-paper-dim/40 p-4 font-serif text-[14px] leading-relaxed text-ink"
            defaultValue={selected.description}
            onChange={(e) => setCustomDescription(e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-accent">Error: {error}</p>
        )}

        <div className="mt-8 flex items-center justify-end gap-4 border-t border-divider pt-6">
          <button
            onClick={onClose}
            className="text-[13px] uppercase tracking-[0.2em] text-ink-mute hover:text-accent"
          >
            Cancel
          </button>
          <button
            onClick={hire}
            disabled={hiring}
            className="rounded-full bg-accent px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
          >
            {hiring ? 'Activating...' : 'Add to firm'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
        New hire
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Add a seat to the firm
      </h2>
      <p className="mt-3 max-w-xl text-[15px] text-ink-mute">
        Each role carries a deep job description that would govern the agent's
        behavior if you later wire them into the firm. Click a role to read it
        and hire.
      </p>

      <div className="mt-8 space-y-10">
        {(Object.entries(byCategory) as [RoleCategory, Role[]][]).map(
          ([cat, roles]) => (
            <section key={cat}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
                {cat}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.map((r) => (
                  <button
                    key={r.slug}
                    onClick={() => setSelected(r)}
                    className="border border-divider bg-paper-dim/30 p-4 text-left transition-colors hover:border-accent hover:bg-paper-dim"
                  >
                    <p className="font-display text-lg tracking-tight">
                      {r.name}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
                      {r.pitch}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  )
}
