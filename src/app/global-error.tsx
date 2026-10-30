'use client'

import { useEffect, useState } from 'react'
import { isStaleBuildError, reloadForNewVersion } from '@/lib/stale-build'

// Last resort when the whole app breaks (replaces the root layout, so it has its own <html>)
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // A reload already happened moments ago and didn't help: show the error instead
  const [gaveUp, setGaveUp] = useState(false)
  const stale = isStaleBuildError(error) && !gaveUp
  useEffect(() => {
    if (!isStaleBuildError(error)) return console.error(error)
    if (!reloadForNewVersion()) setGaveUp(true)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem', color: '#374151' }}>
        {stale ? (
          <p>Atualizando o VivoBuy…</p>
        ) : (
          <>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Algo deu errado</h1>
            <p style={{ marginBottom: '1.5rem' }}>Recarregue a página para tentar de novo.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', borderRadius: 9999, border: 0, background: '#FF6B00', color: 'white' }}>
              Recarregar
            </button>
          </>
        )}
      </body>
    </html>
  )
}
