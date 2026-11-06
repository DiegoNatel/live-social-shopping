'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useUserStore, useNotificationStore } from '@/store'
import { BR_TIME_ZONE } from '@/lib/utils'
import type { User } from '@/types'

type MeResponse =
  | { user: User; interests: string[]; isSeller: boolean; followedHosts: string[]; favoriteIds: string[] }
  | { user: null }

// Loads the signed-in user's profile and notifications into the stores whenever the session changes
export async function loadSession() {
  const res = await fetch('/api/me', { cache: 'no-store' })
  const data: MeResponse = res.ok ? await res.json() : { user: null }
  useUserStore.getState().setSession(data.user ? data : null)
  if (data.user) await useNotificationStore.getState().load()
  else useNotificationStore.getState().reset()
}

// Counts this browser once a day (and again if it signs in), for the founders' dashboard.
// The id is random and identifies nobody; if storage is blocked the visit just isn't counted.
function countVisit(signedIn: boolean) {
  try {
    const mark = `${new Date().toLocaleDateString('en-CA', { timeZone: BR_TIME_ZONE })}:${signedIn}`
    if (localStorage.getItem('watchhaul-visit') === mark) return
    localStorage.setItem('watchhaul-visit', mark)
    const visitorId = localStorage.getItem('watchhaul-visitor') ?? crypto.randomUUID()
    localStorage.setItem('watchhaul-visitor', visitorId)
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    }).catch(() => {})
  } catch {
    // only a metric
  }
}

export function SessionSync() {
  const { data: session, isPending } = authClient.useSession()
  const sessionId = session?.session.id

  useEffect(() => {
    if (isPending) return
    countVisit(!!sessionId)
    if (sessionId) {
      loadSession()
    } else {
      useUserStore.getState().setSession(null)
      useNotificationStore.getState().reset()
    }
  }, [sessionId, isPending])

  return null
}
