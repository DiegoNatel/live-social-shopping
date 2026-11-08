'use client'

import { useEffect } from 'react'
import { restoreEarlyInput } from '@/lib/early-input'

// Puts back anything typed before the page finished loading (see lib/early-input.ts)
export function EarlyInputRestore() {
  useEffect(() => {
    // After React's own work, not inside it: events fired from within an effect are batched,
    // and React would put the old value back before the form's onChange reads the new one
    const timer = setTimeout(restoreEarlyInput, 0)
    return () => clearTimeout(timer)
  }, [])
  return null
}
