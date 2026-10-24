'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useUserStore } from '@/store'
import type { User } from '@/types'

type MeResponse = { user: User; interests: string[]; followedHosts: string[] } | { user: null }

// Loads the signed-in user's profile into the user store whenever the session changes
export async function loadSession() {
  const res = await fetch('/api/me', { cache: 'no-store' })
  const data: MeResponse = res.ok ? await res.json() : { user: null }
  useUserStore.getState().setSession(data.user ? data : null)
}

export function SessionSync() {
  const { data: session, isPending } = authClient.useSession()
  const sessionId = session?.session.id

  useEffect(() => {
    if (isPending) return
    if (sessionId) loadSession()
    else useUserStore.getState().setSession(null)
  }, [sessionId, isPending])

  return null
}
