// Short-lived signed tickets that tell a live room who is connecting.
// Issued by /api/live/[id]/ticket (which checks the session cookie) and verified by the
// LiveRoom Durable Object, which can't read Better Auth sessions itself. WebCrypto only.

export interface TicketPayload {
  sid: string // stream id
  uid: string
  name: string
  username: string
  avatar: string
  verified: boolean
  host: boolean
  exp: number // ms since epoch
}

const TTL_MS = 5 * 60 * 1000
const enc = new TextEncoder()

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

const key = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(`live-ticket:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

export async function signTicket(payload: Omit<TicketPayload, 'exp'>, secret: string) {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body)))
  return `${body}.${b64url(sig)}`
}

export async function verifyTicket(ticket: string, secret: string): Promise<TicketPayload | null> {
  const [body, sig] = ticket.split('.')
  if (!body || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret), fromB64url(sig), enc.encode(body))
    if (!ok) return null
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as TicketPayload
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}
