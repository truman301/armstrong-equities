'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewActions({
  writeupId,
  title,
  ticker,
}: {
  writeupId: string
  title: string
  ticker: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'reject' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function publish() {
    if (
      !window.confirm(
        `Publish "${title}"?\n\nThis makes the note public and adds ${ticker} to the tracked portfolio at the latest close.`,
      )
    ) {
      return
    }
    setBusy('publish')
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/writeups/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeup_id: writeupId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      const msg = data.pick_opened
        ? `Published. Opened pick at $${Number(data.entry_price).toFixed(2)} on ${data.entry_date}.`
        : data.warning
          ? `Published. ${data.warning}`
          : data.note
            ? `Published. ${data.note}`
            : 'Published.'
      setMessage(msg)
      // Give the user a moment to read the toast, then bounce back to the queue.
      setTimeout(() => {
        router.push('/review')
        router.refresh()
      }, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setBusy(null)
    }
  }

  async function reject() {
    if (
      !window.confirm(
        `Reject "${title}"?\n\nThis deletes the draft permanently.`,
      )
    ) {
      return
    }
    setBusy('reject')
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/writeups/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writeup_id: writeupId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      router.push('/review')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="text-[13px] text-emerald-700">{message}</p>
      )}
      {error && <p className="text-[13px] text-accent">Error: {error}</p>}
      <div className="flex items-center justify-end gap-6">
        <button
          onClick={reject}
          disabled={busy !== null}
          className="text-[13px] uppercase tracking-[0.2em] text-ink-mute transition-colors hover:text-accent disabled:opacity-50"
        >
          {busy === 'reject' ? 'Rejecting...' : 'Reject'}
        </button>
        <button
          onClick={publish}
          disabled={busy !== null}
          className="rounded-full bg-accent px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
        >
          {busy === 'publish' ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
