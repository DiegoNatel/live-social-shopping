'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField, inputClass } from '@/components/seller/FormField'
import type { Address } from '@/types'

const emptyForm = (name: string) => ({
  name,
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  phone: '',
  isDefault: false,
})

export function AddressBook({ initial, defaultName }: { initial: Address[]; defaultName: string }) {
  const router = useRouter()
  const [addresses, setAddresses] = useState(initial)
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(initial.length ? null : emptyForm(defaultName))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const reload = async () => {
    const res = await fetch('/api/me/addresses', { cache: 'no-store' })
    if (res.ok) setAddresses(await res.json())
    router.refresh()
  }

  const set = (key: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => f && { ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // Fills street/neighborhood/city/state from the CEP (ViaCEP, free public API)
  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      if (data.erro) return setError('CEP não encontrado')
      setError('')
      setForm(f =>
        f && {
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }
      )
    } catch {
      // Offline or ViaCEP down: the fields can still be typed in
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setIsSaving(true)
    setError('')
    const res = await fetch('/api/me/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setIsSaving(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível salvar')
    }
    setForm(null)
    reload()
  }

  const makeDefault = async (id: string) => {
    await fetch(`/api/me/addresses/${id}`, { method: 'PATCH' })
    reload()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir este endereço?')) return
    await fetch(`/api/me/addresses/${id}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="space-y-3">
      {addresses.map(a => (
        <div key={a.id} className="bg-white rounded-md shadow-card p-4 flex gap-3">
          <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="text-gray-900 font-medium">
              {a.name}
              {a.isDefault && <span className="ml-2 text-xs font-normal text-tropical-green-700 bg-green-50 px-1.5 py-0.5 rounded">Padrão</span>}
            </p>
            <p className="text-gray-600">
              {a.street}, {a.number}
              {a.complement && ` – ${a.complement}`}
            </p>
            <p className="text-gray-600">
              {a.neighborhood}, {a.city} – {a.state}, {a.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
            </p>
            {!a.isDefault && (
              <button onClick={() => makeDefault(a.id)} className="text-sky-blue text-xs hover:underline mt-1">
                Usar como padrão
              </button>
            )}
          </div>
          <button
            onClick={() => remove(a.id)}
            aria-label="Excluir endereço"
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-coral-pink hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {form ? (
        <form onSubmit={save} className="bg-white rounded-md shadow-card p-4 space-y-3">
          <h2 className="text-gray-900 font-medium">Novo endereço</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Destinatário">
              <input className={inputClass} value={form.name} onChange={set('name')} maxLength={100} required />
            </FormField>
            <FormField label="Telefone">
              <input className={inputClass} value={form.phone} onChange={set('phone')} inputMode="tel" maxLength={20} />
            </FormField>
            <FormField label="CEP">
              <input
                className={inputClass}
                value={form.zipCode}
                onChange={e => {
                  set('zipCode')(e)
                  lookupCep(e.target.value)
                }}
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
                required
              />
            </FormField>
            <FormField label="Estado (UF)">
              <input className={inputClass} value={form.state} onChange={set('state')} maxLength={2} required />
            </FormField>
          </div>
          <FormField label="Rua">
            <input className={inputClass} value={form.street} onChange={set('street')} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Número">
              <input className={inputClass} value={form.number} onChange={set('number')} maxLength={20} required />
            </FormField>
            <FormField label="Complemento">
              <input className={inputClass} value={form.complement} onChange={set('complement')} maxLength={100} />
            </FormField>
            <FormField label="Bairro">
              <input className={inputClass} value={form.neighborhood} onChange={set('neighborhood')} required />
            </FormField>
            <FormField label="Cidade">
              <input className={inputClass} value={form.city} onChange={set('city')} required />
            </FormField>
          </div>
          {addresses.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} />
              Usar como endereço padrão
            </label>
          )}
          {error && <p className="text-coral-pink text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            {addresses.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            )}
            <Button type="submit" isLoading={isSaving}>
              Salvar endereço
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" fullWidth leftIcon={<Plus className="w-4 h-4" />} onClick={() => setForm(emptyForm(defaultName))}>
          Adicionar endereço
        </Button>
      )}
    </div>
  )
}
