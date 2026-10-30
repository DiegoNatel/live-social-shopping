'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-renders the page's server data every few seconds while it's on screen, so lives that
// start show up and lives that end disappear without a reload. Keeps scroll and client state.
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && router.refresh()
    const timer = setInterval(refresh, seconds * 1000)
    // Coming back to the tab: catch up at once
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router, seconds])
  return null
}
