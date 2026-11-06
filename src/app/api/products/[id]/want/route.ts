import { getDb } from '@/lib/db'
import { notifyMissedSale, sellersMissingSetup } from '@/lib/seller-readiness'

// A buyer tapped "Quero comprar" on a product whose seller can't sell yet: remind the seller
// (at most once every few hours, see notifyMissedSale). Always answers 204 so it can't be used
// to probe sellers' set-up.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getDb()
    .prepare('SELECT name, seller_id FROM products WHERE id = ? AND is_active = 1 AND blocked_at IS NULL')
    .bind(id)
    .first<{ name: string; seller_id: string }>()
  if (product) {
    const missing = (await sellersMissingSetup([product.seller_id])).get(product.seller_id)
    if (missing) await notifyMissedSale(product.seller_id, product.name, missing)
  }
  return new Response(null, { status: 204 })
}
