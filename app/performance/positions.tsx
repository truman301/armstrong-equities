'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Row = {
  pick_id: string
  ticker: string
  name: string
  entry_date: string
  entry_price: number
  mark_price: number | null
  return_pct: number | null
  alpha_pct: number | null
  days_held: number
  target_price: number | null
  exit_date?: string | null
  exit_reason?: string | null
}

function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function fmtPrice(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  return `$${v.toFixed(2)}`
}

function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function returnColor(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'text-ink-mute'
  return v >= 0 ? 'text-emerald-700' : 'text-accent'
}

export function OpenPositionsTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function close(pickId: string) {
    const reason = window.prompt('Exit reason (optional)?', '') ?? ''
    setBusyId(pickId)
    try {
      const res = await fetch('/api/picks/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pick_id: pickId,
          exit_reason: reason || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Close failed: ${data.error || res.status}`)
        return
      }
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-[15px] text-ink-mute">
        No open positions. Publishing a research note for a new ticker via{' '}
        <code className="text-ink">scripts/review.ts publish</code> adds it
        here.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-divider text-[11px] uppercase tracking-[0.2em] text-ink-mute">
            <th className="py-3 text-left">Ticker</th>
            <th className="py-3 text-left">Name</th>
            <th className="py-3 text-right">Entry</th>
            <th className="py-3 text-right">Entry $</th>
            <th className="py-3 text-right">Mark</th>
            <th className="py-3 text-right">Return</th>
            <th className="py-3 text-right">Alpha</th>
            <th className="py-3 text-right">Days</th>
            <th className="py-3 text-right">Target</th>
            <th className="py-3 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pick_id} className="border-b border-divider/50">
              <td className="py-3 font-display tracking-tight">{r.ticker}</td>
              <td className="py-3 text-ink-mute">{r.name}</td>
              <td className="py-3 text-right text-ink-mute">
                {fmtDate(r.entry_date)}
              </td>
              <td className="py-3 text-right">{fmtPrice(r.entry_price)}</td>
              <td className="py-3 text-right">{fmtPrice(r.mark_price)}</td>
              <td
                className={`py-3 text-right font-medium ${returnColor(r.return_pct)}`}
              >
                {fmtPct(r.return_pct)}
              </td>
              <td
                className={`py-3 text-right ${returnColor(r.alpha_pct)}`}
              >
                {fmtPct(r.alpha_pct)}
              </td>
              <td className="py-3 text-right text-ink-mute">{r.days_held}</td>
              <td className="py-3 text-right text-ink-mute">
                {fmtPrice(r.target_price)}
              </td>
              <td className="py-3 text-right">
                <button
                  onClick={() => close(r.pick_id)}
                  disabled={busyId === r.pick_id}
                  className="text-[11px] uppercase tracking-[0.2em] text-ink-mute transition-colors hover:text-accent disabled:opacity-50"
                >
                  {busyId === r.pick_id ? 'Closing...' : 'Close'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ClosedPositionsTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reopen(pickId: string) {
    if (!window.confirm('Reopen this pick?')) return
    setBusyId(pickId)
    try {
      const res = await fetch('/api/picks/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pick_id: pickId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Reopen failed: ${data.error || res.status}`)
        return
      }
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-[15px] text-ink-mute">No closed positions yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-divider text-[11px] uppercase tracking-[0.2em] text-ink-mute">
            <th className="py-3 text-left">Ticker</th>
            <th className="py-3 text-left">Period</th>
            <th className="py-3 text-right">Entry $</th>
            <th className="py-3 text-right">Exit $</th>
            <th className="py-3 text-right">Return</th>
            <th className="py-3 text-right">Alpha</th>
            <th className="py-3 text-right">Days</th>
            <th className="py-3 text-left">Reason</th>
            <th className="py-3 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pick_id} className="border-b border-divider/50">
              <td className="py-3 font-display tracking-tight">{r.ticker}</td>
              <td className="py-3 text-ink-mute">
                {fmtDate(r.entry_date)} →{' '}
                {r.exit_date ? fmtDate(r.exit_date) : '—'}
              </td>
              <td className="py-3 text-right">{fmtPrice(r.entry_price)}</td>
              <td className="py-3 text-right">{fmtPrice(r.mark_price)}</td>
              <td
                className={`py-3 text-right font-medium ${returnColor(r.return_pct)}`}
              >
                {fmtPct(r.return_pct)}
              </td>
              <td
                className={`py-3 text-right ${returnColor(r.alpha_pct)}`}
              >
                {fmtPct(r.alpha_pct)}
              </td>
              <td className="py-3 text-right text-ink-mute">{r.days_held}</td>
              <td className="py-3 text-ink-mute">{r.exit_reason ?? '—'}</td>
              <td className="py-3 text-right">
                <button
                  onClick={() => reopen(r.pick_id)}
                  disabled={busyId === r.pick_id}
                  className="text-[11px] uppercase tracking-[0.2em] text-ink-mute transition-colors hover:text-accent disabled:opacity-50"
                >
                  {busyId === r.pick_id ? 'Reopening...' : 'Reopen'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
