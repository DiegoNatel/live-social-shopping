import { getSession } from '@/lib/auth'
import { saveReview } from '@/lib/reviews'
import { str, int, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const b = await readJson(request)
  const productId = str(b?.productId, 64)
  const rating = int(b?.rating, 1, 5)
  if (!productId || rating === null) return badRequest('Escolha de 1 a 5 estrelas')

  const ok = await saveReview(session.user.id, productId, rating, str(b?.comment, 1000))
  if (!ok) return Response.json({ error: 'FORBIDDEN', message: 'Só quem comprou pode avaliar' }, { status: 403 })
  return new Response(null, { status: 204 })
}
