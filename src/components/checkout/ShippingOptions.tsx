'use client'

import { useEffect, useState } from 'react'
import { Check, Truck } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { ShippingOption } from '@/lib/shipping'

type Item = { productId: string; quantity: number; variants?: Record<string, string> }

// Freight options for the cart to the delivery CEP (quoted by the server from Melhor Envio).
// Reports the chosen option, or null while loading or when there's none.
export function ShippingOptions({
  zipCode,
  items,
  onChange,
}: {
  zipCode: string
  items: Item[]
  onChange: (option: ShippingOption | null) => void
}) {
  const [options, setOptions] = useState<ShippingOption[] | null>(null)
  const [selected, setSelected] = useState<ShippingOption['id']>('economico')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  // Quote again only when the CEP or the cart really changes
  const key = JSON.stringify([zipCode.replace(/\D/g, ''), items])

  useEffect(() => {
    let cancelled = false
    setOptions(null)
    setError('')
    const [zip, cart] = JSON.parse(key) as [string, Item[]]
    fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipCode: zip, items: cart }),
    })
      .then(async res => {
        const data = (await res.json().catch(() => null)) as { options?: ShippingOption[]; message?: string } | null
        if (cancelled) return
        if (!res.ok || !data?.options?.length) return setError(data?.message ?? 'Não foi possível calcular o frete')
        setOptions(data.options)
      })
      .catch(() => !cancelled && setError('Não foi possível calcular o frete'))
    return () => {
      cancelled = true
    }
  }, [key, attempt])

  const chosen = options?.find(o => o.id === selected) ?? options?.[0] ?? null
  useEffect(() => {
    onChange(chosen)
  }, [chosen, onChange])

  return (
    <div className="mb-6">
      <h3 className="text-gray-900 font-medium mb-2 flex items-center gap-2">
        <Truck className="w-4 h-4 text-gray-400" />
        Entrega
      </h3>
      {error ? (
        <div className="p-3 rounded-xl bg-white shadow-card text-sm">
          <p className="text-coral-pink">{error}</p>
          <button onClick={() => setAttempt(a => a + 1)} className="text-sky-blue mt-1 hover:underline">
            Tentar de novo
          </button>
        </div>
      ) : !options ? (
        <p className="p-3 rounded-xl bg-white shadow-card text-sm text-gray-500">Calculando o frete…</p>
      ) : (
        <div className="space-y-2">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={cn(
                'w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all',
                chosen?.id === o.id ? 'bg-tropical-green/10 border-2 border-tropical-green' : 'bg-white shadow-card border-2 border-transparent'
              )}
            >
              <div className="flex-1">
                <p className="text-gray-900 font-medium text-sm">{o.label}</p>
                <p className="text-gray-500 text-xs">
                  {o.days ? `Chega em até ${o.days} ${o.days > 1 ? 'dias úteis' : 'dia útil'}` : 'Prazo informado pelo vendedor'}
                  {o.shipments.length === 1 && o.shipments[0].company ? ` · ${o.shipments[0].company} ${o.shipments[0].serviceName}` : ''}
                  {o.shipments.length > 1 ? ` · ${o.shipments.length} envios (um por vendedor)` : ''}
                </p>
              </div>
              <span className="text-gray-900 font-medium text-sm">{formatCurrency(o.cents / 100)}</span>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  chosen?.id === o.id ? 'border-tropical-green bg-tropical-green' : 'border-gray-300'
                )}
              >
                {chosen?.id === o.id && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
