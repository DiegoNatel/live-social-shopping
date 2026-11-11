import { getSession } from '@/lib/auth'
import { getCart, parseCartLines, saveCart } from '@/lib/cart'
import { badRequest, readJson } from '@/lib/validate'

// The signed-in buyer's shopping bag, saved to the account (see lib/cart.ts)
export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getCart(session.user.id))
}

// Replaces the saved bag with the one in this browser
export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const lines = parseCartLines((await readJson(request))?.items)
  if (!lines) return badRequest('Sacola inválida')
  await saveCart(session.user.id, lines)
  return new Response(null, { status: 204 })
}
