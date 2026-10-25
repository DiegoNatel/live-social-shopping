// Order pricing rules, shared by the cart/checkout pages and the order API so the
// total shown is always the total charged. All amounts are in centavos.

export const FREE_SHIPPING_FROM_CENTS = 199_00
export const SHIPPING_CENTS = 19_90
export const PIX_DISCOUNT_PERCENT = 5

export interface AppliedCoupon {
  code: string
  percentOff: number
  maxDiscountCents?: number | null
}

export function couponDiscountCents(subtotalCents: number, coupon?: AppliedCoupon | null) {
  if (!coupon) return 0
  const discount = Math.round((subtotalCents * coupon.percentOff) / 100)
  return Math.min(discount, coupon.maxDiscountCents ?? Infinity, subtotalCents)
}

export function computeTotals(subtotalCents: number, opts: { coupon?: AppliedCoupon | null; pix: boolean }) {
  const coupon = couponDiscountCents(subtotalCents, opts.coupon)
  // Free shipping is based on the products' price, before discounts
  const shipping = subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS
  // PIX discount applies after the coupon
  const pix = opts.pix ? Math.round(((subtotalCents - coupon) * PIX_DISCOUNT_PERCENT) / 100) : 0
  return { subtotal: subtotalCents, coupon, shipping, pix, total: subtotalCents - coupon + shipping - pix }
}

export const toCents = (reais: number) => Math.round(reais * 100)
export const fromCents = (cents: number) => cents / 100
