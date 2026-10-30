'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { ReturnRequest } from '@/lib/db'

// Buyers who gave up an order: the seller arranges the return, then releases the refund
export function ReturnRequests({ requests }: { requests: ReturnRequest[] }) {
  if (requests.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-gray-900 font-semibold mb-1">Devoluções</h3>
      <p className="text-gray-500 text-xs mb-3">
        Fale com o comprador para combinar a devolução. O frete de volta é por sua conta. Confirme só depois de receber o produto: o reembolso sai na hora.
      </p>
      <div className="space-y-2">
        {requests.map(r => (
          <ReturnRow key={r.orderId} request={r} />
        ))}
      </div>
    </div>
  )
}

function ReturnRow({ request }: { request: ReturnRequest }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirmReceived = async () => {
    if (!confirm(`Confirmar que recebeu o produto do pedido ${request.orderId}? O comprador será reembolsado.`)) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/seller/orders/${encodeURIComponent(request.orderId)}/return`, { method: 'POST' })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível confirmar')
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-card">
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm font-medium truncate">{request.items}</p>
        <p className="text-gray-500 text-xs truncate">
          <span className="font-mono">{request.orderId}</span> · {request.buyerName}
          {request.buyerEmail && (
            <>
              {' · '}
              <a href={`mailto:${request.buyerEmail}`} className="text-sky-blue hover:underline">
                {request.buyerEmail}
              </a>
            </>
          )}
        </p>
        {error && <p className="text-coral-pink text-xs">{error}</p>}
      </div>
      <Button size="sm" isLoading={busy} onClick={confirmReceived}>
        Recebi de volta
      </Button>
    </div>
  )
}
