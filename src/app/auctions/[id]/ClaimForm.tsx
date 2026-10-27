'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency } from '@/lib/utils'
import { computeTotals, fromCents, VARIANT_LABELS, VARIANT_TYPES } from '@/lib/pricing'
import type { Address, Product } from '@/types'

const PAYMENTS = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de crédito' },
  { id: 'boleto', label: 'Boleto' },
] as const

interface ClaimFormProps {
  auctionId: string
  product: Product
  priceCents: number
  addresses: Address[]
}

export function ClaimForm({ auctionId, product, priceCents, addresses }: ClaimFormProps) {
  const router = useRouter()
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [addressId, setAddressId] = useState(addresses.find(a => a.isDefault)?.id ?? addresses[0]?.id ?? '')
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]['id']>('pix')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const totals = computeTotals(priceCents, { pix: payment === 'pix' })
  const types = VARIANT_TYPES.filter(t => product.variants?.some(v => v.type === t))
  const missing = types.filter(t => !variants[t])

  const submit = async () => {
    const address = addresses.find(a => a.id === addressId)
    if (!address) return setError('Escolha um endereço de entrega')
    if (missing.length) return setError(`Escolha: ${missing.map(t => VARIANT_LABELS[t].toLowerCase()).join(' e ')}`)
    setIsSaving(true)
    setError('')
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auctionId,
        paymentMethod: payment,
        expectedTotalCents: totals.total,
        address,
        items: [{ productId: product.id, quantity: 1, variants }],
      }),
    })
    setIsSaving(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível finalizar. Tente novamente.')
    }
    router.push('/orders')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-md shadow-card p-6 space-y-5">
      <div className="flex gap-3">
        <div className="relative w-20 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
          {product.images[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" />}
        </div>
        <div>
          <p className="text-tropical-green-700 text-xs font-semibold uppercase">Você venceu o leilão 🎉</p>
          <p className="text-gray-900 font-medium">{product.name}</p>
          <p className="text-gray-900 text-lg font-semibold">{formatCurrency(fromCents(priceCents))}</p>
        </div>
      </div>

      {types.map(type => (
        <div key={type}>
          <p className="text-sm text-gray-700 mb-1">{VARIANT_LABELS[type]}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants!
              .filter(v => v.type === type)
              .map(v => (
                <button
                  key={v.id}
                  disabled={v.stock === 0}
                  onClick={() => setVariants(s => ({ ...s, [type]: v.name }))}
                  className={cn(
                    'px-3 h-9 rounded-md border text-sm',
                    variants[type] === v.name ? 'border-sky-blue bg-sky-blue/10 text-sky-blue' : 'border-gray-300 text-gray-700',
                    v.stock === 0 && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {v.name}
                </button>
              ))}
          </div>
        </div>
      ))}

      <div>
        <p className="text-sm text-gray-700 mb-1">Entregar em</p>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Você ainda não tem endereços. <Link href="/addresses" className="text-sky-blue hover:underline">Adicionar endereço</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map(a => (
              <label key={a.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                <span>
                  {a.street}, {a.number} – {a.neighborhood}, {a.city}/{a.state}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-700 mb-1">Pagamento</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENTS.map(p => (
            <button
              key={p.id}
              onClick={() => setPayment(p.id)}
              className={cn(
                'px-3 h-9 rounded-md border text-sm',
                payment === p.id ? 'border-sky-blue bg-sky-blue/10 text-sky-blue' : 'border-gray-300 text-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm space-y-1 border-t border-gray-100 pt-3">
        <div className="flex justify-between text-gray-500">
          <span>Arremate</span>
          <span>{formatCurrency(fromCents(totals.subtotal))}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Frete</span>
          <span>{totals.shipping ? formatCurrency(fromCents(totals.shipping)) : 'Grátis'}</span>
        </div>
        {totals.pix > 0 && (
          <div className="flex justify-between text-tropical-green-700">
            <span>Desconto PIX</span>
            <span>-{formatCurrency(fromCents(totals.pix))}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-900 font-semibold text-base pt-1">
          <span>Total</span>
          <span>{formatCurrency(fromCents(totals.total))}</span>
        </div>
      </div>

      {error && <p className="text-coral-pink text-sm">{error}</p>}
      <Button fullWidth size="lg" isLoading={isSaving} onClick={submit} disabled={addresses.length === 0}>
        Finalizar compra
      </Button>
    </div>
  )
}
