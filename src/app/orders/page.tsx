import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { getOrders } from '@/lib/orders'
import { formatCurrency } from '@/lib/utils'
import type { OrderStatus, PaymentMethod } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Pagamento confirmado', className: 'bg-sky-blue-50 text-sky-blue-700' },
  processing: { label: 'Em preparação', className: 'bg-sky-blue-50 text-sky-blue-700' },
  shipped: { label: 'Enviado', className: 'bg-sky-blue-50 text-sky-blue-700' },
  delivered: { label: 'Entregue', className: 'bg-green-50 text-tropical-green-700' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500' },
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  boleto: 'Boleto',
  wallet: 'Carteira',
}

export default async function OrdersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const orders = await getOrders(session.user.id)

  return (
    <MainLayout headerProps={{ title: 'Meus pedidos' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {orders.length === 0 && (
          <div className="bg-white rounded-md shadow-card p-8 text-center">
            <p className="text-gray-900 font-medium mb-1">Você ainda não fez nenhum pedido</p>
            <Link href="/" className="text-sky-blue text-sm hover:underline">
              Explorar produtos
            </Link>
          </div>
        )}

        {orders.map(order => {
          const status = STATUS_LABELS[order.status]
          return (
            <div key={order.id} className="bg-white rounded-md shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                <div className="text-sm">
                  <span className="text-gray-900 font-medium font-mono">{order.id}</span>
                  <span className="text-gray-400">
                    {' · '}
                    {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${status.className}`}>{status.label}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-sm truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <span className="text-gray-500">{PAYMENT_LABELS[order.paymentMethod]}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(order.total)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </MainLayout>
  )
}
