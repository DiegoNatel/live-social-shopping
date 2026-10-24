// Password hashing with WebCrypto PBKDF2.
// Better Auth's default (scrypt in JS) uses too much CPU for the Workers free plan;
// PBKDF2 runs natively. 100k iterations is the maximum Workers allows.
// Stored format: pbkdf2$<iterations>$<salt b64>$<hash b64>

const ITERATIONS = 100_000

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [scheme, iter, salt, expected] = hash.split('$')
  if (scheme !== 'pbkdf2' || !iter || !salt || !expected) return false
  const actual = new Uint8Array(await derive(password, fromB64(salt), Number(iter)))
  const want = fromB64(expected)
  if (actual.length !== want.length) return false
  // Constant-time comparison
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ want[i]
  return diff === 0
}
