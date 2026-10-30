import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Melhor Envio API (docs.melhorenvio.com.br): freight quotes from Correios, Jadlog and others.
// Only this file talks to Melhor Envio.
//
// MELHOR_ENVIO_TOKEN: a personal access token (Melhor Envio → Integrações → Permissões de
// acesso → Gerar token, scope shipping-calculate). Sandbox by default; MELHOR_ENVIO_ENV=production
// for real quotes.

export class MelhorEnvioError extends Error {}

function config() {
  const env = getCloudflareContext().env
  if (!env.MELHOR_ENVIO_TOKEN) return null
  const base =
    env.MELHOR_ENVIO_URL ||
    (env.MELHOR_ENVIO_ENV === 'production' ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br')
  return { token: env.MELHOR_ENVIO_TOKEN, base, contact: env.MELHOR_ENVIO_CONTACT || 'contato@vivobuy.com.br' }
}

export const melhorEnvioEnabled = () => config() !== null

export interface QuoteProduct {
  id: string
  width: number // cm
  height: number // cm
  length: number // cm
  weight: number // kg
  insurance_value: number // reais
  quantity: number
}

export interface Service {
  id: number
  name: string
  price?: string
  custom_price?: string
  delivery_time?: number
  custom_delivery_time?: number
  company?: { name: string }
  error?: string
}

// Every service's price and delivery time for these products between two CEPs.
// Services that can't deliver come back with `error` instead of a price.
export async function calculate(fromZip: string, toZip: string, products: QuoteProduct[]): Promise<Service[]> {
  const c = config()
  if (!c) throw new MelhorEnvioError('Frete não configurado')
  const res = await fetch(`${c.base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Required by Melhor Envio: app name and a contact email
      'User-Agent': `VivoBuy (${c.contact})`,
    },
    body: JSON.stringify({ from: { postal_code: fromZip }, to: { postal_code: toZip }, products }),
  }).catch((e: unknown) => {
    throw new MelhorEnvioError(`Melhor Envio fora do ar: ${e instanceof Error ? e.message : String(e)}`)
  })
  const data = (await res.json().catch(() => null)) as Service[] | { message?: string; errors?: unknown } | null
  if (!res.ok || !Array.isArray(data)) {
    throw new MelhorEnvioError((data && !Array.isArray(data) && data.message) || `Melhor Envio respondeu ${res.status}`)
  }
  return data
}
