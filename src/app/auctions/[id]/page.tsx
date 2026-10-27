import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { getSession } from '@/lib/auth'
import { getDb, getProductsByIds } from '@/lib/db'
import { listAddresses } from '@/lib/addresses'
import { ClaimForm } from './ClaimForm'

export const dynamic = 'force-dynamic'

// Where the winner of an auction pays for it
export default async function AuctionClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const db = getDb()
  const auction = await db
    .prepare(
      `SELECT a.id, a.product_id, a.current_bid_cents, a.winner_id, a.status,
              (SELECT o.id FROM orders o WHERE o.auction_id = a.id AND o.status != 'cancelled') AS order_id
       FROM auctions a WHERE a.id = ?`
    )
    .bind(id)
    .first<{ id: string; product_id: string; current_bid_cents: number; winner_id: string | null; status: string; order_id: string | null }>()

  const won = auction && auction.status === 'ended' && auction.winner_id === session.user.id
  const [product] = won ? await getProductsByIds([auction.product_id]) : []
  const addresses = won ? await listAddresses(session.user.id) : []

  return (
    <MainLayout headerProps={{ title: 'Seu arremate' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {!won ? (
          <EmptyState title="Arremate não encontrado" text="Só quem venceu o leilão pode finalizar a compra." href="/" linkLabel="Voltar ao início" />
        ) : auction.order_id ? (
          <EmptyState
            title="Este arremate já virou um pedido"
            text={`Pedido ${auction.order_id}`}
            href="/orders"
            linkLabel="Ver meus pedidos"
          />
        ) : !product ? (
          <EmptyState title="O vendedor pausou este produto" text="Fale com o vendedor pelo chat da próxima live." href="/" linkLabel="Voltar ao início" />
        ) : (
          <>
            <ClaimForm auctionId={auction.id} product={product} priceCents={auction.current_bid_cents} addresses={addresses} />
            <p className="text-gray-400 text-xs text-center mt-4">
              Precisa de outro endereço? <Link href="/addresses" className="text-sky-blue hover:underline">Gerenciar endereços</Link>
            </p>
          </>
        )}
      </div>
    </MainLayout>
  )
}
