'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Before shipping the money goes back right away; after, the product has to be returned first
export function RefundOrderButton({ orderId, shipped }: { orderId: string; shipped: boolean }) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  const refund = async () => {
    const question = shipped
      ? `Desistir do pedido ${orderId}? O vendedor vai combinar a devolução com você, e o reembolso sai quando ele receber o produto.`
      : `Cancelar o pedido ${orderId} e receber o dinheiro de volta?`
    if (!confirm(question)) return
    setIsBusy(true)
    const res = await fetch(`/api/orders/${orderId}/refund`, { method: 'POST' })
    setIsBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível pedir o reembolso')
    }
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-coral-pink text-xs">{error}</span>}
      <button onClick={refund} disabled={isBusy} className="text-gray-500 text-xs hover:text-coral-pink hover:underline disabled:opacity-50">
        {isBusy ? 'Enviando…' : shipped ? 'Desistir da compra' : 'Cancelar e reembolsar'}
      </button>
    </span>
  )
}
