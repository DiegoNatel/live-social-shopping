import { requireSeller } from '@/lib/seller'
import { getDb } from '@/lib/db'

// The CEP the seller's packages leave from, used to quote freight: { fromZip }
export async function PUT(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const body = (await request.json().catch(() => null)) as { fromZip?: unknown } | null
  const zip = typeof body?.fromZip === 'string' ? body.fromZip.replace(/\D/g, '') : ''
  if (zip.length !== 8) return Response.json({ message: 'CEP inválido' }, { status: 400 })
  await getDb().prepare('UPDATE users SET ship_from_zip = ? WHERE id = ?').bind(zip, sellerId).run()
  return new Response(null, { status: 204 })
}
