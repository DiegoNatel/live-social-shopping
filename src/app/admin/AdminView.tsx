'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { BR_TIME_ZONE, formatCurrency } from '@/lib/utils'
import type { AdminRefund, OpenReport } from '@/lib/moderation'

const dateLabel = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: BR_TIME_ZONE }) : ''

const TARGET_LABELS = { product: 'Produto', stream: 'Live', message: 'Mensagem no chat' }

const ORDER_LABELS: Record<AdminRefund['kind'], string> = {
  requested: 'Vendedor ainda não confirmou a devolução',
  failed: 'O Asaas recusou o estorno',
  banned_seller: 'Pago, sem envio, de vendedor banido',
}

// Runs an admin action, then reloads the lists
function useAction() {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const run = async (key: string, url: string, init: RequestInit, question?: string) => {
    if (question && !confirm(question)) return
    setBusy(key)
    setError('')
    const res = await fetch(url, init)
    setBusy('')
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      return setError(data?.message ?? 'Não foi possível concluir')
    }
    router.refresh()
  }
  return { busy, error, run }
}

interface AdminViewProps {
  reports: OpenReport[]
  orders: AdminRefund[]
  banned: { id: string; name: string; email: string | null; bannedAt: string; reason: string | null }[]
}

export function AdminView({ reports, orders, banned }: AdminViewProps) {
  const { busy, error, run } = useAction()
  const decide = (id: string, action: string, question?: string) =>
    run(`${id}:${action}`, `/api/admin/reports/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }, question)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {error && <p className="text-coral-pink text-sm">{error}</p>}

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Denúncias abertas ({reports.length})</h2>
        {reports.length === 0 && <p className="text-gray-400 text-sm">Nenhuma denúncia aberta</p>}
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-md shadow-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700">{r.reason}</span>
                <span className="text-gray-400 text-xs">
                  {TARGET_LABELS[r.type]} · {dateLabel(r.createdAt)} · por {r.reporter}
                </span>
              </div>
              <p className="text-gray-900 text-sm break-words">{r.text}</p>
              {r.details && <p className="text-gray-500 text-sm mt-1 break-words">Comentário: {r.details}</p>}
              <p className="text-gray-500 text-xs mt-2">
                {r.userName ?? 'Usuário removido'}
                {r.userEmail && ` · ${r.userEmail}`}
                {r.userReports > 1 && ` · ${r.userReports} denúncias abertas`}
                {r.streamId && (
                  <>
                    {' · '}
                    <Link href={`/live/${r.streamId}`} className="text-sky-blue hover:underline">
                      Abrir live
                    </Link>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="ghost" isLoading={busy === `${r.id}:dismiss`} onClick={() => decide(r.id, 'dismiss')}>
                  Dispensar
                </Button>
                <Button size="sm" variant="secondary" isLoading={busy === `${r.id}:remove`} onClick={() => decide(r.id, 'remove', 'Remover este conteúdo?')}>
                  Remover
                </Button>
                {r.userId && (
                  <Button
                    size="sm"
                    isLoading={busy === `${r.id}:ban`}
                    onClick={() => decide(r.id, 'ban', `Banir ${r.userName}? A conta sai do ar, com todos os produtos e lives.`)}
                  >
                    Remover e banir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Pedidos que precisam de ação ({orders.length})</h2>
        {orders.length === 0 && <p className="text-gray-400 text-sm">Nada pendente</p>}
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.orderId} className="bg-white rounded-md shadow-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm">
                  <span className="font-mono">{o.orderId}</span> · {formatCurrency(o.total)}
                </p>
                <p className="text-gray-500 text-xs">
                  {ORDER_LABELS[o.kind]}
                  {o.since && ` · desde ${dateLabel(o.since)}`}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {o.buyer}
                  {o.buyerEmail && ` · ${o.buyerEmail}`}
                </p>
              </div>
              <Button
                size="sm"
                isLoading={busy === o.orderId}
                onClick={() =>
                  run(o.orderId, `/api/admin/orders/${encodeURIComponent(o.orderId)}/refund`, { method: 'POST' }, `Reembolsar ${formatCurrency(o.total)} ao comprador?`)
                }
              >
                Reembolsar
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Contas banidas ({banned.length})</h2>
        {banned.length === 0 && <p className="text-gray-400 text-sm">Nenhuma conta banida</p>}
        <div className="space-y-2">
          {banned.map(u => (
            <div key={u.id} className="bg-white rounded-md shadow-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm truncate">
                  {u.name}
                  {u.email && ` · ${u.email}`}
                </p>
                <p className="text-gray-500 text-xs">
                  {dateLabel(u.bannedAt)}
                  {u.reason && ` · ${u.reason}`}
                </p>
              </div>
              <Button size="sm" variant="ghost" isLoading={busy === u.id} onClick={() => run(u.id, `/api/admin/users/${u.id}`, { method: 'DELETE' }, `Reativar ${u.name}?`)}>
                Reativar
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
