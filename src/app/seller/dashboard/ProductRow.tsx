'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'
import { cn, formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

// A seller's product with inline editing of price and stock, and pause/reactivate
export function ProductRow({ product }: { product: Product }) {
  const router = useRouter()
  const paused = product.isActive === false
  const basePrice = product.flashSale?.regularPrice ?? product.price
  const [isEditing, setIsEditing] = useState(false)
  const [price, setPrice] = useState(String(basePrice).replace('.', ','))
  const [stock, setStock] = useState(String(product.stock))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const update = async (patch: Record<string, unknown>) => {
    setIsSaving(true)
    setError('')
    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setIsSaving(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      setError(data?.message ?? 'Não foi possível salvar')
      return false
    }
    router.refresh()
    return true
  }

  const save = async () => {
    if (await update({ price: price.replace(',', '.'), stock })) setIsEditing(false)
  }

  return (
    <div className={cn('p-3 rounded-xl bg-white shadow-card', paused && 'opacity-70')}>
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {product.images[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium truncate">
            {product.name}
            {paused && <span className="ml-2 text-xs font-normal bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Pausado</span>}
          </p>
          <p className="text-gray-900 font-bold">
            {formatCurrency(product.price)}
            {product.flashSale && (
              <span className="ml-2 text-xs font-medium text-coral-pink">relâmpago -{product.flashSale.discountPercent}%</span>
            )}
          </p>
          <p className="text-gray-400 text-xs">
            {product.stock} em estoque
            {!!product.variants?.length && ` · ${product.variants.length} variações`}
          </p>
        </div>
        <button
          onClick={() => setIsEditing(e => !e)}
          aria-label="Editar produto"
          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-700">
              Preço (R$)
              <input className={cn(inputClass, 'mt-1')} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              Estoque total
              <input className={cn(inputClass, 'mt-1')} inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)} />
            </label>
          </div>
          {product.flashSale && (
            <p className="text-xs text-gray-400">A oferta relâmpago aplica o desconto sobre este preço.</p>
          )}
          {error && <p className="text-coral-pink text-sm">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => update({ isActive: paused })}>
              {paused ? 'Reativar produto' : 'Pausar vendas'}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" isLoading={isSaving} onClick={save}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
