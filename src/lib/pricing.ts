// Order pricing rules, shared by the cart/checkout pages and the order API so the
// total shown is always the total charged. All amounts are in centavos.

import type { Product, ProductVariant } from '@/types'

// Flat shipping per seller when a real quote isn't available (see lib/shipping.ts)
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

// shippingCents: the freight option the buyer chose (0 until a CEP is known). Discounts
// apply to the products only, never to shipping.
export function computeTotals(subtotalCents: number, opts: { coupon?: AppliedCoupon | null; pix: boolean; shippingCents?: number }) {
  const coupon = couponDiscountCents(subtotalCents, opts.coupon)
  const shipping = opts.shippingCents ?? 0
  // PIX discount applies after the coupon
  const pix = opts.pix ? Math.round(((subtotalCents - coupon) * PIX_DISCOUNT_PERCENT) / 100) : 0
  return { subtotal: subtotalCents, coupon, shipping, pix, total: subtotalCents - coupon + shipping - pix }
}

export const toCents = (reais: number) => Math.round(reais * 100)
export const fromCents = (cents: number) => cents / 100

// ---------- Variants ----------
// A product can have size and/or color variants, each with its own stock and an
// optional price modifier. Choices are stored as { size: 'M', color: 'Azul' }.

export type VariantType = ProductVariant['type']
export const VARIANT_TYPES: VariantType[] = ['size', 'color']
export const VARIANT_LABELS: Record<VariantType, string> = { size: 'Tamanho', color: 'Cor' }

export function chosenVariants(product: Pick<Product, 'variants'>, selected?: Record<string, string>) {
  return VARIANT_TYPES.flatMap(type => {
    const v = product.variants?.find(v => v.type === type && v.name === selected?.[type])
    return v ? [v] : []
  })
}

// Variant types the product offers that haven't been chosen yet
export function missingVariantTypes(product: Pick<Product, 'variants'>, selected?: Record<string, string>) {
  return VARIANT_TYPES.filter(
    type => product.variants?.some(v => v.type === type) && !chosenVariants(product, selected).some(v => v.type === type)
  )
}

// Unit price in reais, including the chosen variants' modifiers
export function unitPrice(product: Pick<Product, 'price' | 'variants'>, selected?: Record<string, string>) {
  const cents = toCents(product.price) + chosenVariants(product, selected).reduce((sum, v) => sum + toCents(v.priceModifier ?? 0), 0)
  return fromCents(cents)
}

// Most units that can be bought with these choices
export function availableStock(product: Pick<Product, 'stock' | 'variants' | 'flashSale'>, selected?: Record<string, string>) {
  return Math.min(product.stock, product.flashSale?.remaining ?? Infinity, ...chosenVariants(product, selected).map(v => v.stock))
}

export function variantLabel(selected?: Record<string, string>) {
  return VARIANT_TYPES.filter(t => selected?.[t]).map(t => `${VARIANT_LABELS[t]}: ${selected![t]}`).join(' • ')
}
