'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PLATFORM_FEE_PERCENT } from '@/lib/fees'

// Where the seller's money goes: their Asaas wallet. Until it's set, Watchhaul holds their part.
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
      <div className="rounded-md bg-white shadow-card p-4 mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="w-5 h-5 text-tropical-green shrink-0" />
          <div className="min-w-0">
            <p className="text-gray-900 font-medium">Carteira Asaas …{walletId.slice(-4)}</p>
            <p className="text-gray-500 text-sm">Sua parte de cada venda paga cai direto nela.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Alterar
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md bg-white shadow-card border-l-4 border-sunset-gold p-4 mb-6">
      <p className="text-gray-900 font-medium mb-1">Receba suas vendas</p>
      <p className="text-gray-500 text-sm mb-3">
        Os pagamentos são feitos pelo Asaas. Crie uma conta grátis em asaas.com e cole aqui o Wallet ID da sua conta
        (no Asaas: ícone de perfil → Integrações). A cada venda paga, sua parte cai direto lá, já descontada a taxa da Watchhaul de{' '}
        {PLATFORM_FEE_PERCENT}%. Em vendas parceladas, sua parte cai mês a mês, a cada parcela, e a taxa do Asaas sai de cada parte da venda.
      </p>
      <Link
        href="/como-receber"
        className="inline-flex items-center gap-1 text-sky-blue text-sm font-medium hover:underline mb-3"
      >
        <CircleHelp className="w-4 h-4" />
        Como criar a conta e achar o Wallet ID (passo a passo)
      </Link>
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
