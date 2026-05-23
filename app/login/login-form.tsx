'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginFormInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const dest = params.get('redirect') || '/'
      router.push(dest)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] uppercase tracking-[0.3em] text-ink-mute"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full border border-divider bg-paper px-3 py-3 text-[15px] focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-[11px] uppercase tracking-[0.3em] text-ink-mute"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full border border-divider bg-paper px-3 py-3 text-[15px] focus:border-accent focus:outline-none"
        />
      </div>
      {error && <p className="text-[13px] text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-accent px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-mute">Loading...</div>}>
      <LoginFormInner />
    </Suspense>
  )
}
