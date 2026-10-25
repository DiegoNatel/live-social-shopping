'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store'

// Refreshes the cart's saved product copies (prices, stock, flash sales) once the
// persisted cart has loaded. Returns true when something in the cart changed.
export function useFreshCart() {
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    const run = () => useCartStore.getState().refreshProducts().then(setChanged)
    if (useCartStore.persist.hasHydrated()) {
      run()
      return
    }
    return useCartStore.persist.onFinishHydration(run)
  }, [])
  return changed
}
