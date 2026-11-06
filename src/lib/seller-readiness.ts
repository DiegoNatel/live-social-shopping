import 'server-only'
import { getDb } from './db'
import { listSteps, missingSetup, type SetupStep } from './seller-setup'

// What each seller still has to set up before they can be bought from (see lib/seller-setup.ts);
// sellers missing nothing are left out of the map
export async function sellersMissingSetup(sellerIds: string[]): Promise<Map<string, SetupStep[]>> {
  const ids = [...new Set(sellerIds)]
  const map = new Map<string, SetupStep[]>()
  if (ids.length === 0) return map
  const { results } = await getDb()
    .prepare(
      `SELECT id, ship_from_zip, asaas_wallet_id IS NOT NULL AS has_wallet FROM users
       WHERE id IN (${ids.map(() => '?').join(',')})`
    )
    .bind(...ids)
    .all<{ id: string; ship_from_zip: string | null; has_wallet: number }>()
  for (const r of results) {
    const missing = missingSetup({ shipFromZip: r.ship_from_zip, hasWallet: !!r.has_wallet })
    if (missing.length) map.set(r.id, missing)
  }
  return map
}

const MISSED_SALE_TITLE = 'Alguém quis comprar na sua loja'
// One reminder per seller in this window, however many buyers try
const REMIND_EVERY_HOURS = 6

// Tells a seller (in the app and by e-mail) that a buyer wanted their product but couldn't buy,
// and links straight to the first thing to fix
export async function notifyMissedSale(sellerId: string, productName: string, missing: SetupStep[]) {
  const db = getDb()
  const recent = await db
    .prepare(
      `SELECT 1 AS x FROM notifications WHERE user_id = ? AND title = ?
       AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`
    )
    .bind(sellerId, MISSED_SALE_TITLE, `-${REMIND_EVERY_HOURS} hours`)
    .first<number>('x')
  if (recent) return
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, action_url, email_status)
       VALUES (?, ?, 'message', ?, ?, ?, 'pending')`
    )
    .bind(
      crypto.randomUUID(),
      sellerId,
      MISSED_SALE_TITLE,
      `Um comprador quis "${productName}", mas sua loja ainda não pode vender. Falta cadastrar ${listSteps(missing)}. Leva poucos minutos.`,
      `/seller/settings?focus=${missing[0]}`
    )
    .run()
}

// The message buyers see when they can't buy yet
export const SELLER_NOT_READY_MESSAGE =
  'Este vendedor ainda está configurando a loja e não pode receber pedidos agora. Avisamos que você quer comprar.'
