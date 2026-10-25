import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { checkCoupon } from '@/lib/coupons'
import { str, int, badRequest, readJson } from '@/lib/validate'

// Previews a coupon for the cart: { code, items: [{ productId, quantity }] }.
// The order API checks it again when the order is placed.
export async function POST(request: Request) {
  const body = await readJson(request)
  const code = str(body?.code, 32)
  if (!code || !Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 50) {
    return badRequest('Cupom inválido')
  }

  const qty = new Map<string, number>()
  for (const i of body.items as Record<string, unknown>[]) {
    const productId = str(i?.productId, 64)
    const quantity = int(i?.quantity, 1, 99)
    if (!productId || quantity === null) return badRequest('Carrinho inválido')
    qty.set(productId, (qty.get(productId) ?? 0) + quantity)
  }

  const { results } = await getDb()
    .prepare(`SELECT id, price_cents FROM products WHERE is_active = 1 AND id IN (${[...qty.keys()].map(() => '?').join(',')})`)
    .bind(...qty.keys())
    .all<{ id: string; price_cents: number }>()
  const subtotal = results.reduce((sum, p) => sum + p.price_cents * (qty.get(p.id) ?? 0), 0)

  const session = await getSession()
  const result = await checkCoupon(code, session?.user.id ?? null, subtotal)
  return result.ok ? Response.json(result.coupon) : Response.json({ message: result.message }, { status: 422 })
}
