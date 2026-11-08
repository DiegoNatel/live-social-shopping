'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False in the server HTML and until React has taken over the page, then true. Forms that send
// passwords disable their submit button until then: submitted before that, the browser would
// send the fields itself, with no JavaScript to stop it.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
