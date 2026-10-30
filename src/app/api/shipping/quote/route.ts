import { getSession } from '@/lib/auth'
import { priceCart, OrderError } from '@/lib/orders'
import { quoteShipping, ShippingError } from '@/lib/shipping'
import { str } from '@/lib/validate'

// Freight options for a cart to a CEP: { zipCode, items: [{ productId, quantity, variants }] }.
// The order API quotes again when the order is placed.
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json().catch(() => null)) as { zipCode?: unknown; items?: unknown } | null
  const zipCode = str(body?.zipCode, 9)
  if (!zipCode || !Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 50) {
    return Response.json({ message: 'Informe o CEP e os produtos' }, { status: 400 })
  }
  const items = (body.items as Record<string, unknown>[]).map(i => ({
    productId: String(i?.productId ?? ''),
    quantity: Math.min(99, Math.max(1, Math.floor(Number(i?.quantity) || 1))),
    variants: i?.variants && typeof i.variants === 'object' ? (i.variants as Record<string, string>) : undefined,
  }))
  try {
    const { lines } = await priceCart(items)
    return Response.json({ options: await quoteShipping(zipCode, lines) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof ShippingError || e instanceof OrderError) return Response.json({ message: e.message }, { status: 400 })
    throw e
  }
}
