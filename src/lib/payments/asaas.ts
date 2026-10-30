import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Asaas REST API (docs.asaas.com). Only this file talks to Asaas, so switching payment
// providers later means replacing it and keeping lib/payments.ts.
//
// ASAAS_API_KEY: sandbox keys (sandbox.asaas.com) charge nobody; set ASAAS_ENV=production
// with a production key to charge for real.

export class AsaasError extends Error {}

function config() {
  const env = getCloudflareContext().env
  if (!env.ASAAS_API_KEY) return null
  const base = env.ASAAS_API_URL || (env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3')
  return { key: env.ASAAS_API_KEY, base }
}

export const asaasEnabled = () => config() !== null
// Which Asaas the keys point at; ids from one don't exist in the other
export const asaasEnv = () => (getCloudflareContext().env.ASAAS_ENV === 'production' ? 'production' : 'sandbox')

async function call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const c = config()
  if (!c) throw new AsaasError('Pagamentos não configurados')
  // Network failures count as Asaas errors too, so callers handle them the same way
  const res = await fetch(`${c.base}${path}`, {
    method,
    headers: { access_token: c.key, 'Content-Type': 'application/json', 'User-Agent': 'VivoBuy' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((e: unknown) => {
    throw new AsaasError(`Asaas fora do ar: ${e instanceof Error ? e.message : String(e)}`)
  })
  const data = (await res.json().catch(() => null)) as { errors?: { description?: string }[] } | null
  if (!res.ok) {
    const message = data?.errors?.map(e => e.description).filter(Boolean).join('; ') || `Asaas respondeu ${res.status}`
    throw new AsaasError(message)
  }
  return data as T
}

export type BillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
// PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED, CHARGEBACK_REQUESTED, …
export type ChargeStatus = string

export interface Charge {
  id: string
  status: ChargeStatus
  invoiceUrl: string
  value: number
}

export const createCustomer = (c: { name: string; cpfCnpj: string; email?: string; externalReference: string }) =>
  call<{ id: string }>('POST', '/customers', { ...c, notificationDisabled: true })

export const createCharge = (c: {
  customer: string
  billingType: BillingType
  value: number
  dueDate: string
  description: string
  externalReference: string
  // Each part is a percentage of what's left after Asaas's fee; the rest stays with VivoBuy
  split: { walletId: string; percentualValue: number }[]
}) => call<Charge>('POST', '/payments', { ...c, split: c.split.length ? c.split : undefined })

export const getCharge = (id: string) => call<Charge>('GET', `/payments/${encodeURIComponent(id)}`)

export const getPixQrCode = (id: string) =>
  call<{ encodedImage: string; payload: string; expirationDate: string }>('GET', `/payments/${encodeURIComponent(id)}/pixQrCode`)

// VivoBuy's own wallet: splitting to it is refused by Asaas (it's already the one charging)
let ownWallet: Promise<string | null> | undefined
export function getOwnWalletId() {
  ownWallet ??= call<{ data: { id: string }[] }>('GET', '/wallets')
    .then(r => r.data[0]?.id ?? null)
    .catch(e => {
      ownWallet = undefined
      throw e
    })
  return ownWallet
}

export const deleteCharge = (id: string) => call<{ deleted: boolean }>('DELETE', `/payments/${encodeURIComponent(id)}`)

// The webhook configured in Asaas sends this token in the asaas-access-token header
export function webhookTokenMatches(token: string | null) {
  const expected = getCloudflareContext().env.ASAAS_WEBHOOK_TOKEN
  return !!expected && token === expected
}

export const PAID_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']
