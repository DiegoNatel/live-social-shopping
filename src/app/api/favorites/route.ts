import { getSession } from '@/lib/auth'
import { setFavorite } from '@/lib/engagement'
import { str, badRequest, readJson } from '@/lib/validate'

async function handle(request: Request, favorite: boolean) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const productId = str((await readJson(request))?.productId, 64)
  if (!productId) return badRequest('Produto inválido')
  await setFavorite(session.user.id, productId, favorite)
  return new Response(null, { status: 204 })
}

export const POST = (request: Request) => handle(request, true)
export const DELETE = (request: Request) => handle(request, false)
