'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  const cancel = async () => {
    if (!confirm(`Cancelar o pedido ${orderId}?`)) return
    setIsBusy(true)
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
    setIsBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível cancelar')
    }
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-coral-pink text-xs">{error}</span>}
      <button onClick={cancel} disabled={isBusy} className="text-gray-500 text-xs hover:text-coral-pink hover:underline disabled:opacity-50">
        {isBusy ? 'Cancelando…' : 'Cancelar pedido'}
      </button>
    </span>
  )
}
