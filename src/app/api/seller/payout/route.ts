import { requireSeller } from '@/lib/seller'
import { getDb } from '@/lib/db'

// The seller's Asaas wallet id (Asaas → Minha conta → Integrações → Carteira), where their
// part of each sale is sent. { walletId: null } removes it.
export async function PUT(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const body = (await request.json().catch(() => null)) as { walletId?: unknown } | null
  const raw = body?.walletId
  const walletId = typeof raw === 'string' ? raw.trim().toLowerCase() : null
  if (raw !== null && !(walletId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(walletId))) {
    return Response.json({ message: 'ID da carteira inválido. Ele tem o formato 00000000-0000-0000-0000-000000000000.' }, { status: 400 })
  }
  await getDb().prepare('UPDATE users SET asaas_wallet_id = ? WHERE id = ?').bind(walletId, sellerId).run()
  return new Response(null, { status: 204 })
}
