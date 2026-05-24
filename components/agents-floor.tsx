'use client'

import { useMemo, useState } from 'react'
import { ROLES, type Role, type RoleCategory } from '@/lib/roles'

// The /agents page is a typographic board, not an illustration. Each agent
// is a card with their role label, name, and live status. Click opens the
// agent detail modal; click "+ New Hire" opens the role catalog.

export interface AgentSeat {
  slug: string
  name: string
  role: string
  description: string
  status: 'idle' | 'building' | 'reviewing'
  currentTicker: string | null
  pending: boolean
}

interface Props {
  pm: AgentSeat | null
  gamingPod: { analyst: AgentSeat; associate: AgentSeat }
  softwarePod: { analyst: AgentSeat; associate: AgentSeat }
  hires: AgentSeat[]
}

export default function AgentsBoard({
  pm,
  gamingPod,
  softwarePod,
  hires,
}: Props) {
  const [openAgent, setOpenAgent] = useState<AgentSeat | null>(null)
  const [openNewHire, setOpenNewHire] = useState(false)

  return (
    <div>
      {/* PM: solo card at the top, set off from the pods. */}
      {pm && (
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <AgentCard
              agent={pm}
              onClick={() => setOpenAgent(pm)}
              variant="pm"
            />
          </div>
        </div>
      )}

      {/* Soft connector line down to the pods. */}
      <div
        aria-hidden
        className="mx-auto my-8 h-10 w-px bg-divider"
      />

      {/* Two pods, side by side: Gaming on the left, Software on the right. */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Pod
          title="Gaming"
          analyst={gamingPod.analyst}
          associate={gamingPod.associate}
          onSelect={setOpenAgent}
        />
        <Pod
          title="Software"
          analyst={softwarePod.analyst}
          associate={softwarePod.associate}
          onSelect={setOpenAgent}
        />
      </div>

      {/* Hires + the New Hire CTA. */}
      <div className="mt-20 border-t border-divider pt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6">
          <p className="text-[11px] uppercase tracking-[0.35em] text-ink-mute">
            Other seats {hires.length > 0 && `(${hires.length})`}
          </p>
          <button
            onClick={() => setOpenNewHire(true)}
            className="rounded-full bg-accent px-5 py-2 font-display text-[12px] uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink"
          >
            + New Hire
          </button>
        </div>

        {hires.length === 0 ? (
          <p className="mt-6 text-[15px] italic text-ink-mute">
            No hires beyond the five core seats yet. Use New Hire to add a role.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hires.map((h) => (
              <AgentCard
                key={h.slug}
                agent={h}
                onClick={() => setOpenAgent(h)}
              />
            ))}
          </div>
        )}
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

function Pod({
  title,
  analyst,
  associate,
  onSelect,
}: {
  title: string
  analyst: AgentSeat
  associate: AgentSeat
  onSelect: (a: AgentSeat) => void
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-ink-soft">
        {title} Pod
      </p>
      <div className="mt-4 space-y-4">
        <AgentCard agent={analyst} onClick={() => onSelect(analyst)} />
        <AgentCard agent={associate} onClick={() => onSelect(associate)} />
      </div>
    </div>
  )
}

function AgentCard({
  agent,
  onClick,
  variant,
}: {
  agent: AgentSeat
  onClick: () => void
  variant?: 'pm'
}) {
  const isPm = variant === 'pm'
  return (
    <button
      onClick={onClick}
      className="group block w-full border border-divider bg-paper-dim/30 p-6 text-left transition-colors hover:border-accent hover:bg-paper-dim"
    >
      <p
        className={`text-[10px] uppercase tracking-[0.35em] ${
          isPm ? 'text-accent' : 'text-ink-mute'
        }`}
      >
        {agent.role}
      </p>
      <p
        className={`mt-3 font-display font-semibold tracking-tight ${
          isPm ? 'text-3xl' : 'text-xl'
        } text-ink group-hover:text-accent transition-colors`}
      >
        {agent.name}
      </p>
      <StatusLine
        status={agent.status}
        ticker={agent.currentTicker}
        pending={agent.pending}
      />
    </button>
  )
}

function StatusLine({
  status,
  ticker,
  pending,
}: {
  status: 'idle' | 'building' | 'reviewing'
  ticker: string | null
  pending: boolean
}) {
  if (pending) {
    return (
      <p className="mt-4 text-[13px] italic text-ink-mute">
        Awaiting activation
      </p>
    )
  }
  const dotClass =
    status === 'building'
      ? 'bg-emerald-600 animate-pulse'
      : status === 'reviewing'
        ? 'bg-accent animate-pulse'
        : 'bg-ink-soft'
  const text =
    status === 'building'
      ? ticker
        ? `Building thesis on ${ticker}`
        : 'Building'
      : status === 'reviewing'
        ? ticker
          ? `Reviewing ${ticker}`
          : 'Reviewing'
        : 'Idle this tick'
  return (
    <p className="mt-4 flex items-center gap-3 text-[13px] text-ink">
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
      />
      {text}
    </p>
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

function AgentDetail({ agent }: { agent: AgentSeat }) {
  const status = agent.pending
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

        {error && <p className="mt-4 text-[13px] text-accent">Error: {error}</p>}

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
        Each role carries a deep job description that governs the agent's
        behavior once activated. Click a role to read it and hire.
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
