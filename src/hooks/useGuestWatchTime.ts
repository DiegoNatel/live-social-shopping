import { useEffect, useRef } from 'react'

const FIRST_PROMPT_MS = 10 * 60_000
const REPEAT_PROMPT_MS = 5 * 60_000
const TICK_MS = 5_000
const WATCHED_KEY = 'watchhaul-guest-watched-ms'
const NEXT_KEY = 'watchhaul-guest-prompt-at-ms'

// Kept in the browser so reloading or changing lives doesn't start the count over. Storage
// can be blocked (private windows): the count then just lasts as long as the page.
const read = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
const write = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // only a convenience
  }
}

// Counts the time a signed-out viewer spends watching, with the tab visible, and calls
// onDue after FIRST_PROMPT_MS and then every REPEAT_PROMPT_MS
export function useGuestWatchTime(enabled: boolean, onDue: () => void) {
  const due = useRef(onDue)
  due.current = onDue

  useEffect(() => {
    if (!enabled) return
    let watched = read(WATCHED_KEY)
    let nextAt = read(NEXT_KEY) || FIRST_PROMPT_MS
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      watched += TICK_MS
      write(WATCHED_KEY, watched)
      if (watched < nextAt) return
      nextAt = watched + REPEAT_PROMPT_MS
      write(NEXT_KEY, nextAt)
      due.current()
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [enabled])
}
