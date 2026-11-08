'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { FormField, inputClass } from '@/components/seller/FormField'
import { ImageUpload } from '@/components/seller/ImageUpload'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBrlAmount, toPriceInput, INVALID_PRICE_MESSAGE } from '@/lib/money'
import type { Category } from '@/types'
import type { SellerProduct } from '@/lib/seller'

interface VariantRow {
  // Set for a variant that already exists (editing), so it's updated instead of recreated
  id?: string
  type: 'size' | 'color'
  name: string
  value: string
  stock: string
  priceModifier: string
}

const emptyVariant = (type: VariantRow['type']): VariantRow => ({
  type,
  name: '',
  value: '#000000',
  stock: '',
  priceModifier: '',
})

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

// Creates a product, or edits every field of an existing one (`product`)
export function ProductForm({ categories, product }: { categories: Category[]; product?: SellerProduct }) {
  const router = useRouter()
  const editing = !!product
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? toPriceInput(product.price) : '',
    originalPrice: product?.originalPrice ? toPriceInput(product.originalPrice) : '',
    stock: product ? String(product.stock) : '',
    category: product?.category || categories[0]?.slug || '',
    tags: product?.tags.join(', ') ?? '',
    // Package for shipping quotes (optional; a small parcel when empty)
    weightG: text(product?.package.weightG),
    heightCm: text(product?.package.heightCm),
    widthCm: text(product?.package.widthCm),
    lengthCm: text(product?.package.lengthCm),
  })
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map(v => ({
      id: v.id,
      type: v.type,
      name: v.name,
      value: v.type === 'color' ? v.value : '#000000',
      stock: String(v.stock),
      priceModifier: v.priceModifier ? toPriceInput(v.priceModifier) : '',
    })) ?? []
  )
  const updateVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants(vs => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length === 0) {
      setError('Adicione pelo menos uma imagem.')
      return
    }
    const price = parseBrlAmount(form.price)
    const originalPrice = form.originalPrice.trim() ? parseBrlAmount(form.originalPrice) : undefined
    if (price === null || price <= 0) return setError(INVALID_PRICE_MESSAGE)
    if (originalPrice === null) return setError('Preço original inválido. Use o formato 1.299,90')
    setIsSaving(true)
    setError('')
    const res = await fetch(product ? `/api/seller/products/${product.id}` : '/api/seller/products', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price,
        originalPrice,
        stock: form.stock,
        category: form.category,
        images,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        package: { weightG: form.weightG, heightCm: form.heightCm, widthCm: form.widthCm, lengthCm: form.lengthCm },
        variants: variants.map(v => ({
          id: v.id,
          type: v.type,
          name: v.name,
          value: v.type === 'color' ? v.value : v.name,
          stock: v.stock,
          // Sent as typed ("15,00", "-10,00"); the server reads Brazilian format
          priceModifier: v.priceModifier.trim() || undefined,
        })),
      }),
    })
    if (res.ok) {
      router.push(editing ? '/seller/dashboard' : '/seller/dashboard?published=1')
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    setError(data?.message ?? 'Não foi possível salvar o produto.')
    setIsSaving(false)
  }

  return (
    <MainLayout headerProps={{ title: editing ? 'Editar produto' : 'Novo produto', showBack: true }}>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-card p-6 space-y-4">
          {product && !product.isActive && (
            <p className="text-sm bg-gray-100 text-gray-600 rounded-md px-3 py-2">
              Este produto está pausado. Salvar não o reativa; para voltar a vender, use &quot;Reativar produto&quot; no painel.
            </p>
          )}
          <FormField label="Nome do produto">
            <input className={inputClass} value={form.name} onChange={set('name')} maxLength={120} required />
          </FormField>
          <FormField label="Descrição">
            <textarea
              className={`${inputClass} h-24 py-2`}
              value={form.description}
              onChange={set('description')}
              maxLength={2000}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Preço (R$)" hint="Ex.: 1.299,90">
              <input className={inputClass} inputMode="decimal" placeholder="79,90" value={form.price} onChange={set('price')} required />
            </FormField>
            <FormField label="Preço original (R$)" hint="Opcional, para mostrar desconto">
              <input className={inputClass} inputMode="decimal" value={form.originalPrice} onChange={set('originalPrice')} />
            </FormField>
            <FormField label="Estoque">
              <input className={inputClass} inputMode="numeric" value={form.stock} onChange={set('stock')} required />
            </FormField>
            <FormField label="Peso com embalagem (g)" hint="Para calcular o frete. Vazio: 300 g">
              <input className={inputClass} inputMode="numeric" value={form.weightG} onChange={set('weightG')} />
            </FormField>
            <FormField label="Embalagem: altura × largura × comprimento (cm)" hint="Vazio: 4 × 12 × 17 cm">
              <div className="grid grid-cols-3 gap-2">
                <input className={inputClass} inputMode="numeric" placeholder="A" aria-label="Altura (cm)" value={form.heightCm} onChange={set('heightCm')} />
                <input className={inputClass} inputMode="numeric" placeholder="L" aria-label="Largura (cm)" value={form.widthCm} onChange={set('widthCm')} />
                <input className={inputClass} inputMode="numeric" placeholder="C" aria-label="Comprimento (cm)" value={form.lengthCm} onChange={set('lengthCm')} />
              </div>
            </FormField>
            <FormField label="Categoria">
              <select className={inputClass} value={form.category} onChange={set('category')}>
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div>
            <span className="block text-sm text-gray-700 mb-1">Imagens</span>
            <ImageUpload value={images} onChange={setImages} max={8} />
          </div>
          <div>
            <span className="block text-sm text-gray-700 mb-1">Variações</span>
            <p className="text-xs text-gray-400 mb-2">
              Opcional. Cada tamanho e cada cor tem seu próprio estoque; o comprador precisa escolher um de cada tipo.
              Use a diferença de preço para opções mais caras (ou mais baratas, com valor negativo).
            </p>
            {variants.length > 0 && (
              <div className="space-y-2 mb-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="w-16 text-xs text-gray-500">{v.type === 'size' ? 'Tamanho' : 'Cor'}</span>
                    {v.type === 'color' && (
                      <input
                        type="color"
                        aria-label="Cor"
                        className="h-10 w-10 rounded-md border border-gray-300 bg-white p-1"
                        value={v.value}
                        onChange={e => updateVariant(i, { value: e.target.value })}
                      />
                    )}
                    <input
                      className={cn(inputClass, 'w-auto flex-1 min-w-[96px]')}
                      placeholder={v.type === 'size' ? 'P, M, 42...' : 'Azul'}
                      aria-label="Nome"
                      value={v.name}
                      maxLength={30}
                      onChange={e => updateVariant(i, { name: e.target.value })}
                      required
                    />
                    <input
                      className={cn(inputClass, 'w-24')}
                      placeholder="Estoque"
                      aria-label="Estoque da variação"
                      inputMode="numeric"
                      value={v.stock}
                      onChange={e => updateVariant(i, { stock: e.target.value })}
                      required
                    />
                    <input
                      className={cn(inputClass, 'w-28')}
                      placeholder="+ R$ 0,00"
                      aria-label="Diferença de preço (R$)"
                      inputMode="decimal"
                      value={v.priceModifier}
                      onChange={e => updateVariant(i, { priceModifier: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label="Remover variação"
                      className="h-10 w-10 flex items-center justify-center rounded-md text-gray-400 hover:text-coral-pink hover:bg-gray-50"
                      onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setVariants(vs => [...vs, emptyVariant('size')])}
              >
                Tamanho
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setVariants(vs => [...vs, emptyVariant('color')])}
              >
                Cor
              </Button>
            </div>
          </div>
          <FormField label="Tags" hint="Separadas por vírgula">
            <input className={inputClass} value={form.tags} onChange={set('tags')} placeholder="vestido, verão" />
          </FormField>

          {error && <p className="text-coral-pink text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editing ? 'Salvar alterações' : 'Salvar produto'}
            </Button>
          </div>
        </div>
      </form>
    </MainLayout>
  )
}
