'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// The CEP the seller ships from. Until it's set, buyers pay a flat shipping fee for their items.
export function ShipFromPanel({ zip }: { zip: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(!zip)
  const [value, setValue] = useState(zip ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/seller/shipping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromZip: value }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível salvar')
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing && zip) {
    return (
      <p className="text-gray-500 text-xs mb-6">
        Seus envios saem do CEP {zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}.{' '}
        <button onClick={() => setEditing(true)} className="text-sky-blue hover:underline">
          Alterar
        </button>
      </p>
    )
  }

  return (
    <div className="rounded-md bg-white shadow-card border-l-4 border-sky-blue p-4 mb-6">
      <p className="text-gray-900 font-medium mb-1">De onde você envia?</p>
      <p className="text-gray-500 text-sm mb-3">
        Com o CEP de onde saem seus pacotes, o comprador vê o frete real dos Correios e transportadoras. O valor do frete vem
        junto com o pagamento, para você comprar a etiqueta.
      </p>
      <Input placeholder="00000-000" inputMode="numeric" maxLength={9} value={value} onChange={e => setValue(e.target.value)} />
      {error && <p className="text-coral-pink text-sm mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-3">
        {zip && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
        <Button size="sm" isLoading={busy} disabled={!value.trim()} onClick={save}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

// On a paid order: the seller types the tracking code once the package is posted
export function ShipOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/seller/orders/${encodeURIComponent(orderId)}/shipment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingCode: code }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível salvar')
    }
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sky-blue text-xs font-medium hover:underline">
        Informar rastreio
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Código de rastreio"
          className="flex-1 min-w-0 h-8 px-2 rounded border border-gray-300 text-xs uppercase"
        />
        <Button size="sm" isLoading={busy} disabled={!code.trim()} onClick={save}>
          Enviado
        </Button>
      </div>
      {error && <p className="text-coral-pink text-xs">{error}</p>}
    </div>
  )
}
