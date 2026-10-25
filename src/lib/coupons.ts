import 'server-only'
import { getDb } from './db'
import { formatCurrency } from './utils'
import type { AppliedCoupon } from './pricing'

export type CouponCheck = { ok: true; coupon: AppliedCoupon } | { ok: false; message: string }

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

// Checks a code for this customer and cart; the order API re-checks at purchase time
export async function checkCoupon(rawCode: string, userId: string | null, subtotalCents: number): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase()
  const row = await getDb()
    .prepare(
      `SELECT c.*,
              (c.starts_at IS NULL OR c.starts_at <= ${NOW}) AS started,
              (c.ends_at IS NULL OR c.ends_at > ${NOW}) AS not_expired,
              (SELECT count(*) FROM orders o
               WHERE o.user_id = ?2 AND o.coupon_code = c.code AND o.status != 'cancelled') AS used_by_user
       FROM coupons c WHERE c.code = ?1`
    )
    .bind(code, userId)
    .first<Record<string, any>>()

  if (!row || !row.is_active || !row.started) return { ok: false, message: 'Cupom inválido' }
  if (!row.not_expired) return { ok: false, message: 'Este cupom expirou' }
  if (row.max_uses !== null && row.uses_count >= row.max_uses) return { ok: false, message: 'Este cupom esgotou' }
  if (row.used_by_user > 0) return { ok: false, message: 'Você já usou este cupom' }
  if (subtotalCents < row.min_subtotal_cents) {
    return { ok: false, message: `Cupom válido para compras a partir de ${formatCurrency(row.min_subtotal_cents / 100)}` }
  }
  return { ok: true, coupon: { code: row.code, percentOff: row.percent_off, maxDiscountCents: row.max_discount_cents } }
}
