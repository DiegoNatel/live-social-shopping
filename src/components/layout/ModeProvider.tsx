'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserStore } from '@/store'
import { saveMode, type AppMode } from '@/lib/mode'

const ModeContext = createContext<{ mode: AppMode; setMode: (mode: AppMode) => void }>({
  mode: 'buyer',
  setMode: () => {},
})

// Holds buyer/seller mode for the whole app (initial value from the cookie, read by the layout)
export function ModeProvider({ initial, children }: { initial: AppMode; children: React.ReactNode }) {
  const [mode, setModeState] = useState(initial)
  const setMode = useCallback((next: AppMode) => {
    saveMode(next)
    setModeState(next)
  }, [])

  // Seller mode needs a seller account: back to buyer after signing out or switching to an
  // account that doesn't sell (once the session has been checked)
  const { sessionLoaded, isSeller } = useUserStore()
  useEffect(() => {
    if (mode === 'seller' && sessionLoaded && !isSeller) setMode('buyer')
  }, [mode, sessionLoaded, isSeller, setMode])

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export const useMode = () => useContext(ModeContext)
