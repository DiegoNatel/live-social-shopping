import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { paymentsEnabled } from '@/lib/payments'

// What the checkout needs to ask for: online payment on/off, and whether the CPF is saved
export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const taxId = await getDb().prepare('SELECT tax_id FROM users WHERE id = ?').bind(session.user.id).first<string | null>('tax_id')
  return Response.json({
    enabled: paymentsEnabled(),
    // Only the end of the CPF, to show which one is saved
    savedTaxId: taxId ? `***.***.${taxId.slice(6, 9)}-${taxId.slice(9)}` : null,
  })
}
