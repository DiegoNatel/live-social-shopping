'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentPanel } from '@/components/checkout/PaymentPanel'

// Opens the order's Pix QR code or card/boleto link, for orders still waiting for payment
export function PayOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sky-blue text-xs font-medium hover:underline">
        Pagar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-medium">Pagar pedido {orderId}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 text-sm hover:text-gray-600">
                Fechar
              </button>
            </div>
            <PaymentPanel orderId={orderId} onPaid={() => router.refresh()} />
          </div>
        </div>
      )}
    </>
  )
}
