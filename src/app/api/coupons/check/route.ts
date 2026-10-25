import { getSession } from '@/lib/auth'
import { checkCoupon } from '@/lib/coupons'
import { priceCart, OrderError, type CartItemInput } from '@/lib/orders'
import { str, int, badRequest, readJson } from '@/lib/validate'

// Previews a coupon for the cart: { code, items: [{ productId, quantity, variants }] }.
// The cart is priced exactly as the order API prices it, which checks the coupon again.
export async function POST(request: Request) {
  const body = await readJson(request)
  const code = str(body?.code, 32)
  if (!code || !Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 50) {
    return badRequest('Cupom inválido')
  }
  const items: CartItemInput[] = []
  for (const i of body.items as Record<string, any>[]) {
    const productId = str(i?.productId, 64)
    const quantity = int(i?.quantity, 1, 99)
    if (!productId || quantity === null) return badRequest('Carrinho inválido')
    const variants =
      i.variants && typeof i.variants === 'object'
        ? (Object.fromEntries(Object.entries(i.variants).filter(([, v]) => typeof v === 'string').slice(0, 10)) as Record<string, string>)
        : undefined
    items.push({ productId, quantity, variants })
  }

  let subtotal: number
  try {
    subtotal = (await priceCart(items)).subtotal
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ message: e.message }, { status: 422 })
    throw e
  }
  const session = await getSession()
  const result = await checkCoupon(code, session?.user.id ?? null, subtotal)
  return result.ok ? Response.json(result.coupon) : Response.json({ message: result.message }, { status: 422 })
}
