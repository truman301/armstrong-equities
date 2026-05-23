'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="border border-divider bg-paper-dim/40 p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-mute">
          Sent
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">
          Thanks. I&apos;ll be in touch.
        </p>
        <button
          onClick={() => {
            setName('')
            setEmail('')
            setSubject('')
            setMessage('')
            setDone(false)
          }}
          className="mt-6 text-[11px] uppercase tracking-[0.3em] text-ink-mute hover:text-accent"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-[11px] uppercase tracking-[0.3em] text-ink-mute"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full border border-divider bg-paper px-3 py-3 text-[15px] focus:border-accent focus:outline-none"
          />
        </div>
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
      </div>
      <div>
        <label
          htmlFor="subject"
          className="block text-[11px] uppercase tracking-[0.3em] text-ink-mute"
        >
          Subject
          <span className="ml-2 normal-case tracking-normal text-ink-soft">
            (optional)
          </span>
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-2 w-full border border-divider bg-paper px-3 py-3 text-[15px] focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="block text-[11px] uppercase tracking-[0.3em] text-ink-mute"
        >
          Message
        </label>
        <textarea
          id="message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 h-56 w-full resize-y border border-divider bg-paper px-3 py-3 text-[15px] leading-relaxed focus:border-accent focus:outline-none"
        />
      </div>
      {error && (
        <p className="text-[13px] text-accent">Error: {error}</p>
      )}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-accent px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
