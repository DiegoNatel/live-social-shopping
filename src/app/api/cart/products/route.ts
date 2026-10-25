import { getProductsByIds } from '@/lib/db'
import { strList, badRequest, readJson } from '@/lib/validate'

// Current data (price, stock, variants, flash sale) for the products in a cart.
// Products that were removed or paused are left out.
export async function POST(request: Request) {
  const ids = strList((await readJson(request))?.ids, 50, 64)
  if (ids.length === 0) return badRequest('Carrinho vazio')
  return Response.json(await getProductsByIds(ids))
}
