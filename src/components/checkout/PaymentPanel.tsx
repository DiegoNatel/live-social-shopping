'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { PAY_WITHIN_MINUTES } from '@/lib/fees'
import type { PaymentInfo } from '@/lib/payments'

// How to pay an order: the Pix QR code and copia e cola, or a link to Asaas's card/boleto page.
// Checks every few seconds until the payment arrives.
export function PaymentPanel({ orderId, initial, onPaid }: { orderId: string; initial?: PaymentInfo | null; onPaid?: () => void }) {
  const [info, setInfo] = useState<PaymentInfo | null>(initial ?? null)
  const [error, setError] = useState('')
  const [needsTaxId, setNeedsTaxId] = useState(false)
  const [taxId, setTaxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(
    async (body?: { taxId: string }, statusOnly = false) => {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment${statusOnly ? '?status' : ''}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => null)) as (PaymentInfo & { error?: string; message?: string }) | null
      if (statusOnly) {
        if (res.ok && data) setInfo(prev => (prev ? { ...prev, status: data.status } : prev))
        return
      }
      if (!res.ok || !data) {
        setNeedsTaxId(data?.error === 'TAX_ID')
        setError(data?.message ?? 'Não foi possível carregar o pagamento')
        return
      }
      setError('')
      setNeedsTaxId(false)
      setInfo(data)
    },
    [orderId]
  )

  useEffect(() => {
    if (!info) void load()
  }, [info, load])

  // Pix and card payments usually arrive within seconds
  const status = info?.status
  useEffect(() => {
    if (status !== 'pending') return
    const timer = setInterval(() => void load(undefined, true), 5000)
    return () => clearInterval(timer)
  }, [status, load])

  useEffect(() => {
    if (status === 'paid') onPaid?.()
  }, [status, onPaid])

  const copy = async () => {
    if (!info?.pix) return
    await navigator.clipboard.writeText(info.pix.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (needsTaxId) {
    return (
      <div className="space-y-3">
        <Input label="CPF" placeholder="000.000.000-00" inputMode="numeric" value={taxId} onChange={e => setTaxId(e.target.value)} />
        {error && <p className="text-coral-pink text-sm">{error}</p>}
        <Button
          fullWidth
          isLoading={busy}
          onClick={async () => {
            setBusy(true)
            await load({ taxId })
            setBusy(false)
          }}
        >
          Gerar pagamento
        </Button>
      </div>
    )
  }

  if (!info) {
    return error ? (
      <div className="text-center space-y-2">
        <p className="text-coral-pink text-sm">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          Tentar de novo
        </Button>
      </div>
    ) : (
      <p className="text-gray-500 text-sm text-center">Gerando o pagamento…</p>
    )
  }

  if (info.status === 'paid') {
    return (
      <p className="flex items-center justify-center gap-2 text-tropical-green font-medium">
        <Check className="w-5 h-5" /> Pagamento confirmado!
      </p>
    )
  }
  if (info.status === 'cancelled') return <p className="text-gray-500 text-sm text-center">Este pedido foi cancelado.</p>

  if (info.pix) {
    return (
      <div className="text-center space-y-3">
        <p className="text-gray-700 text-sm">
          Pague {formatCurrency(info.total)} com o app do seu banco: escaneie o QR Code ou use o Pix copia e cola.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${info.pix.image}`} alt="QR Code Pix" className="w-52 h-52 mx-auto" />
        <div className="flex gap-2">
          <input readOnly value={info.pix.code} onFocus={e => e.target.select()} className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-gray-300 text-xs text-gray-600" />
          <Button size="sm" onClick={copy} leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-gray-400 text-xs">
          Pague em até {PAY_WITHIN_MINUTES.pix} minutos para garantir seu pedido. Esta tela atualiza sozinha.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-3">
      <p className="text-gray-700 text-sm">
        {info.method === 'boleto' ? 'Seu boleto está pronto.' : 'Pague com cartão na página segura do Asaas, nosso parceiro de pagamentos.'}
      </p>
      {info.url && (
        <a href={info.url} target="_blank" rel="noopener noreferrer" className="block">
          <Button fullWidth rightIcon={<ExternalLink className="w-4 h-4" />}>
            {info.method === 'boleto' ? 'Ver boleto' : `Pagar ${formatCurrency(info.total)} com cartão`}
          </Button>
        </a>
      )}
      <p className="text-gray-400 text-xs">Depois de pagar, esta tela atualiza sozinha.</p>
    </div>
  )
}
