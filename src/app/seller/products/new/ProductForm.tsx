'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { FormField, inputClass } from '@/components/seller/FormField'
import type { Category } from '@/types'

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: categories[0]?.slug ?? '',
    images: '',
    tags: '',
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    const res = await fetch('/api/seller/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: form.price.replace(',', '.'),
        originalPrice: form.originalPrice ? form.originalPrice.replace(',', '.') : undefined,
        stock: form.stock,
        category: form.category,
        images: form.images.split(/\s+/).filter(Boolean),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      router.push('/seller/dashboard')
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    setError(data?.message ?? 'Não foi possível salvar o produto.')
    setIsSaving(false)
  }

  return (
    <MainLayout headerProps={{ title: 'Novo produto', showBack: true }}>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-card p-6 space-y-4">
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
            <FormField label="Preço (R$)">
              <input className={inputClass} inputMode="decimal" value={form.price} onChange={set('price')} required />
            </FormField>
            <FormField label="Preço original (R$)" hint="Opcional, para mostrar desconto">
              <input className={inputClass} inputMode="decimal" value={form.originalPrice} onChange={set('originalPrice')} />
            </FormField>
            <FormField label="Estoque">
              <input className={inputClass} inputMode="numeric" value={form.stock} onChange={set('stock')} required />
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
          <FormField label="Imagens" hint="Links https das imagens, um por linha (upload de arquivos em breve)">
            <textarea
              className={`${inputClass} h-20 py-2`}
              value={form.images}
              onChange={set('images')}
              placeholder="https://..."
              required
            />
          </FormField>
          <FormField label="Tags" hint="Separadas por vírgula">
            <input className={inputClass} value={form.tags} onChange={set('tags')} placeholder="vestido, verão" />
          </FormField>

          {error && <p className="text-coral-pink text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Salvar produto
            </Button>
          </div>
        </div>
      </form>
    </MainLayout>
  )
}
