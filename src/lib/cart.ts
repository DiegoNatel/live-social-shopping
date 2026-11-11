import 'server-only'
import { getDb, getProductsByIds } from './db'
import { str } from './validate'
import { availableStock } from './pricing'
import type { CartItem } from '@/types'

// The shopping bag saved to the account (table `carts`), so it's the same on every device.
// Only what was chosen is stored; product data, prices and stock are read fresh each time.

export interface CartLine {
  id: string
  productId: string
  quantity: number
  variants?: Record<string, string>
}

const MAX_LINES = 50

// Cart lines from a request body, or null when they aren't valid
export function parseCartLines(v: unknown): CartLine[] | null {
  if (!Array.isArray(v) || v.length > MAX_LINES) return null
  const lines: CartLine[] = []
  for (const raw of v) {
    const id = str(raw?.id, 40)
    const productId = str(raw?.productId, 64)
    const quantity = Number(raw?.quantity)
    if (!id || !productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null
    const chosen =
      raw.variants && typeof raw.variants === 'object' && !Array.isArray(raw.variants)
        ? Object.entries(raw.variants as Record<string, unknown>)
            .filter((e): e is [string, string] => typeof e[1] === 'string' && !!e[1] && e[0].length <= 20 && e[1].length <= 60)
            .slice(0, 10)
        : []
    lines.push({ id, productId, quantity, variants: chosen.length ? Object.fromEntries(chosen) : undefined })
  }
  return lines
}

export async function saveCart(userId: string, lines: CartLine[]) {
  await getDb()
    .prepare(
      `INSERT INTO carts (user_id, items) VALUES (?1, ?2)
       ON CONFLICT(user_id) DO UPDATE SET items = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
    .bind(userId, JSON.stringify(lines))
    .run()
}

// The saved bag with current product data. Products that were removed, paused or sold out
// are left out, and quantities are capped at what's in stock.
export async function getCart(userId: string): Promise<CartItem[]> {
  const saved = await getDb().prepare('SELECT items FROM carts WHERE user_id = ?').bind(userId).first<string>('items')
  let lines: CartLine[] = []
  try {
    lines = parseCartLines(JSON.parse(saved ?? '[]')) ?? []
  } catch {
    // an unreadable row is an empty bag
  }
  if (lines.length === 0) return []
  const products = new Map((await getProductsByIds([...new Set(lines.map(l => l.productId))])).map(p => [p.id, p]))
  return lines.flatMap(line => {
    const product = products.get(line.productId)
    if (!product) return []
    const quantity = Math.min(line.quantity, availableStock(product, line.variants))
    return quantity > 0 ? [{ id: line.id, product, quantity, selectedVariants: line.variants }] : []
  })
}
