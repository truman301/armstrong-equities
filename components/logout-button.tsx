'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Sign-out button rendered in the site header. POSTs to /api/auth/logout to
// clear the Supabase session cookie, then sends the user back to /login.
export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="hover:text-accent transition-colors disabled:opacity-50"
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
