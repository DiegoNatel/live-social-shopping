'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isStaleBuildError, reloadForNewVersion } from '@/lib/stale-build'

// Shown when a page breaks in the browser. An old version left open across a deploy
// reloads itself instead.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A reload already happened moments ago and didn't help: show the error instead
  const [gaveUp, setGaveUp] = useState(false)
  const stale = isStaleBuildError(error) && !gaveUp
  useEffect(() => {
    if (!isStaleBuildError(error)) return console.error(error)
    if (!reloadForNewVersion()) setGaveUp(true)
  }, [error])

  if (stale) return <p className="p-8 text-center text-gray-500 text-sm">Atualizando o VivoBuy…</p>
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-gray-900 text-xl font-semibold mb-2">Algo deu errado</h1>
      <p className="text-gray-500 mb-6">Tente de novo. Se continuar, recarregue a página.</p>
      <div className="flex flex-col gap-2 items-center">
        <button onClick={reset} className="text-white bg-primary rounded-full px-6 h-11 font-medium">
          Tentar de novo
        </button>
        <Link href="/" className="text-sky-blue text-sm hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
