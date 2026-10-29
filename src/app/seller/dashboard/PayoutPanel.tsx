'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PLATFORM_FEE_PERCENT } from '@/lib/fees'

// Where the seller's money goes: their Asaas wallet. Until it's set, VivoBuy holds their part.
export function PayoutPanel({ walletId }: { walletId: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(!walletId)
  const [value, setValue] = useState(walletId ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/seller/payout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId: value.trim() }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível salvar')
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing && walletId) {
    return (
      <p className="text-gray-500 text-xs mb-6">
        Suas vendas caem na carteira Asaas …{walletId.slice(-4)}.{' '}
        <button onClick={() => setEditing(true)} className="text-sky-blue hover:underline">
          Alterar
        </button>
      </p>
    )
  }

  return (
    <div className="rounded-md bg-white shadow-card border-l-4 border-sunset-gold p-4 mb-6">
      <p className="text-gray-900 font-medium mb-1">Receba suas vendas</p>
      <p className="text-gray-500 text-sm mb-3">
        Os pagamentos são feitos pelo Asaas. Crie uma conta grátis em asaas.com e cole aqui o ID da sua carteira
        (Asaas → Minha conta → Integrações). A cada venda paga, sua parte cai direto lá, já descontada a taxa da VivoBuy de{' '}
        {PLATFORM_FEE_PERCENT}%.
      </p>
      <Input placeholder="00000000-0000-0000-0000-000000000000" value={value} onChange={e => setValue(e.target.value)} />
      {error && <p className="text-coral-pink text-sm mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-3">
        {walletId && (
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
