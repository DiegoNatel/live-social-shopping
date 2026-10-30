import 'server-only'
import { getDb } from './db'
import * as me from './melhor-envio'
import { SHIPPING_CENTS } from './pricing'
import { notify } from './orders'

// Shipping: each seller sends their own items from their CEP and buys the label themselves
// (Melhor Envio or Correios); the buyer pays the real freight, which goes to the seller in
// the payment split. The checkout offers two options across all sellers in the cart:
// "Econômico" (each seller's cheapest service) and "Expresso" (each seller's fastest).
//
// Without Melhor Envio set up, or for a seller who hasn't entered their CEP yet, a flat
// SHIPPING_CENTS per seller is charged instead.

export type ShippingOptionId = 'economico' | 'expresso'

export interface Shipment {
  sellerId: string
  serviceId: number | null
  serviceName: string
  company: string | null
  cents: number
  days: number | null
}

export interface ShippingOption {
  id: ShippingOptionId
  label: string
  cents: number
  // Slowest seller's delivery time, in business days
  days: number | null
  shipments: Shipment[]
}

export class ShippingError extends Error {}

// Used when a product has no size or weight set (a small parcel)
export const DEFAULT_PACKAGE = { weightG: 300, heightCm: 4, widthCm: 12, lengthCm: 17 }

export interface ShippingLine {
  productId: string
  sellerId: string
  quantity: number
  unitPriceCents: number
}

const flat = (sellerId: string): Shipment => ({
  sellerId,
  serviceId: null,
  serviceName: 'Envio padrão',
  company: null,
  cents: SHIPPING_CENTS,
  days: null,
})

// One seller's services for their items, cheapest first; [] when none can deliver
async function sellerServices(fromZip: string, toZip: string, lines: ShippingLine[], sizes: Map<string, SizeRow>) {
  const services = await me.calculate(
    fromZip,
    toZip,
    lines.map(l => {
      const s = sizes.get(l.productId)
      return {
        id: l.productId,
        weight: (s?.weight_g ?? DEFAULT_PACKAGE.weightG) / 1000,
        height: s?.height_cm ?? DEFAULT_PACKAGE.heightCm,
        width: s?.width_cm ?? DEFAULT_PACKAGE.widthCm,
        length: s?.length_cm ?? DEFAULT_PACKAGE.lengthCm,
        insurance_value: l.unitPriceCents / 100,
        quantity: l.quantity,
      }
    })
  )
  return services
    .filter(s => !s.error && (s.custom_price ?? s.price))
    .map(s => ({
      sellerId: '',
      serviceId: s.id,
      serviceName: s.name,
      company: s.company?.name ?? null,
      cents: Math.round(Number(s.custom_price ?? s.price) * 100),
      days: s.custom_delivery_time ?? s.delivery_time ?? null,
    }))
    .filter(s => Number.isFinite(s.cents) && s.cents > 0)
    .sort((a, b) => a.cents - b.cents)
}

// Seller CEPs in logs: enough to debug a route, without the full address
const fromZipLog = (zip: string) => `${zip.slice(0, 5)}-***`

type SizeRow = { id: string; weight_g: number | null; height_cm: number | null; width_cm: number | null; length_cm: number | null }

// The shipping options for these cart lines to a CEP. Throws ShippingError when an item
// can't be delivered there.
export async function quoteShipping(toZipRaw: string, lines: ShippingLine[]): Promise<ShippingOption[]> {
  const toZip = toZipRaw.replace(/\D/g, '')
  if (toZip.length !== 8) throw new ShippingError('Informe um CEP válido')
  const db = getDb()
  const sellerIds = [...new Set(lines.map(l => l.sellerId))]
  const productIds = [...new Set(lines.map(l => l.productId))]
  const [{ results: sellers }, { results: sizes }] = await Promise.all([
    db
      .prepare(`SELECT id, name, ship_from_zip FROM users WHERE id IN (${sellerIds.map(() => '?').join(',')})`)
      .bind(...sellerIds)
      .all<{ id: string; name: string; ship_from_zip: string | null }>(),
    db
      .prepare(`SELECT id, weight_g, height_cm, width_cm, length_cm FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`)
      .bind(...productIds)
      .all<SizeRow>(),
  ])
  const sizeById = new Map(sizes.map(s => [s.id, s]))

  const perSeller = await Promise.all(
    sellerIds.map(async sellerId => {
      const seller = sellers.find(s => s.id === sellerId)
      if (!me.melhorEnvioEnabled() || !seller?.ship_from_zip) return { sellerId, cheapest: flat(sellerId), fastest: flat(sellerId) }
      let services
      try {
        services = await sellerServices(seller.ship_from_zip, toZip, lines.filter(l => l.sellerId === sellerId), sizeById)
      } catch (e) {
        if (!(e instanceof me.MelhorEnvioError)) throw e
        console.error('Melhor Envio quote failed', sellerId, fromZipLog(seller.ship_from_zip), '->', toZip, e.message)
        throw new ShippingError(
          e.invalid
            ? 'Não conseguimos calcular o frete para esse CEP. Confira se ele está certo.'
            : 'Não foi possível calcular o frete agora. Tente de novo em instantes.'
        )
      }
      if (services.length === 0) throw new ShippingError(`${seller.name} não entrega nesse CEP`)
      const tagged = services.map(s => ({ ...s, sellerId }))
      // Fastest: fewest days, then cheapest
      const fastest = [...tagged].sort((a, b) => (a.days ?? 99) - (b.days ?? 99) || a.cents - b.cents)[0]
      return { sellerId, cheapest: tagged[0], fastest }
    })
  )

  const option = (id: ShippingOptionId, label: string, pick: 'cheapest' | 'fastest'): ShippingOption => {
    const shipments = perSeller.map(p => p[pick])
    const days = shipments.every(s => s.days !== null) ? Math.max(...shipments.map(s => s.days!)) : null
    return { id, label, cents: shipments.reduce((sum, s) => sum + s.cents, 0), days, shipments }
  }
  const economico = option('economico', 'Econômico', 'cheapest')
  const expresso = option('expresso', 'Expresso', 'fastest')
  // No real quote at all (Melhor Envio off, or no seller has a CEP): say it's a flat fee
  if (economico.shipments.every(s => s.serviceId === null)) return [{ ...economico, label: 'Envio padrão' }]
  // Same services either way (only one service available): offer just one
  const same = economico.shipments.every((s, i) => s.serviceId === expresso.shipments[i].serviceId)
  return same ? [economico] : [economico, expresso]
}

// Public tracking page for a code (Correios, Jadlog and others)
export const trackingUrl = (code: string) => `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`

// A seller sends their part of a paid order: saves the tracking code and tells the buyer.
// Once every seller in the order has shipped, the order is marked shipped.
export async function markShipped(sellerId: string, orderId: string, trackingCode: string) {
  const db = getDb()
  const order = await db
    .prepare(`SELECT user_id, refund_status FROM orders WHERE id = ? AND status IN ('confirmed', 'processing', 'shipped')`)
    .bind(orderId)
    .first<{ user_id: string; refund_status: string | null }>()
  if (!order) return 'not_paid' as const
  if (order.refund_status) return 'refunding' as const
  const saved = await db
    .prepare(
      `UPDATE order_shipments SET tracking_code = ?, shipped_at = coalesce(shipped_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE order_id = ? AND seller_id = ?`
    )
    .bind(trackingCode, orderId, sellerId)
    .run()
  if (saved.meta.changes === 0) return 'not_found' as const
  await db.batch([
    db
      .prepare(
        `UPDATE orders SET status = 'shipped', tracking_code = ?1
         WHERE id = ?2 AND status IN ('confirmed', 'processing')
           AND NOT EXISTS (SELECT 1 FROM order_shipments WHERE order_id = ?2 AND tracking_code IS NULL)`
      )
      .bind(trackingCode, orderId),
    notify(order.user_id, 'order_update', 'Pedido enviado', `Parte do pedido ${orderId} foi enviada. Código de rastreio: ${trackingCode}.`, '/orders'),
  ])
  return 'ok' as const
}
