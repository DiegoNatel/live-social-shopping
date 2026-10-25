'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { FormField, inputClass } from '@/components/seller/FormField'
import type { Category } from '@/types'

interface StreamFormProps {
  categories: Category[]
  products: { id: string; name: string }[]
}

export function StreamForm({ categories, products }: StreamFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: categories[0]?.slug ?? '',
    scheduledAt: '',
    thumbnail: '',
  })
  const [productIds, setProductIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))
  const toggleProduct = (id: string) =>
    setProductIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    const res = await fetch('/api/seller/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        // datetime-local is in the seller's timezone; send an absolute time
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '',
        thumbnail: form.thumbnail || undefined,
        productIds,
      }),
    })
    if (res.ok) {
      router.push('/seller/dashboard')
      router.refresh()
      return
    }
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    setError(data?.message ?? 'Não foi possível agendar a live.')
    setIsSaving(false)
  }

  return (
    <MainLayout headerProps={{ title: 'Agendar live', showBack: true }}>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-card p-6 space-y-4">
          <FormField label="Título">
            <input className={inputClass} value={form.title} onChange={set('title')} maxLength={120} required />
          </FormField>
          <FormField label="Descrição">
            <textarea className={`${inputClass} h-24 py-2`} value={form.description} onChange={set('description')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Categoria">
              <select className={inputClass} value={form.category} onChange={set('category')}>
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Data e hora">
              <input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={set('scheduledAt')} required />
            </FormField>
          </div>
          <FormField label="Imagem de capa" hint="Link https (opcional)">
            <input className={inputClass} value={form.thumbnail} onChange={set('thumbnail')} placeholder="https://..." />
          </FormField>

          <div>
            <span className="block text-sm text-gray-700 mb-2">Produtos na live</span>
            {products.length === 0 ? (
              <p className="text-gray-400 text-sm">Cadastre produtos para mostrá-los durante a live.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-coral-pink text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Agendar live
            </Button>
          </div>
        </div>
      </form>
    </MainLayout>
  )
}
