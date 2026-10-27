import { requireSeller } from '@/lib/seller'
import { getStreamGuests, inviteGuest, removeGuest, respondToInvite } from '@/lib/guests'
import { broadcast } from '@/lib/live'
import { str, badRequest, readJson } from '@/lib/validate'

// The host's guest list for a live
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const guests = await getStreamGuests(sellerId, (await params).id)
  if (!guests) return new Response('Not found', { status: 404 })
  return Response.json(guests)
}

const INVITE_ERRORS = {
  forbidden: [404, 'Live não encontrada'],
  not_found: [404, 'Nenhum vendedor com esse usuário'],
  self: [400, 'Você já é o anfitrião desta live'],
  already: [409, 'Este vendedor já foi convidado'],
} as const

// { username } invites a seller (host only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const username = str((await readJson(request))?.username, 40)
  if (!username) return badRequest('Informe o usuário do vendedor')

  const result = await inviteGuest(sellerId, (await params).id, username)
  if (result === 'ok') return new Response(null, { status: 201 })
  const [status, message] = INVITE_ERRORS[result]
  return Response.json({ message }, { status })
}

// { accept: boolean } answers an invitation (the invited seller)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const accept = (await readJson(request))?.accept
  if (typeof accept !== 'boolean') return badRequest('Resposta inválida')
  if (!(await respondToInvite(sellerId, (await params).id, accept))) return new Response('Not found', { status: 404 })
  return new Response(null, { status: 204 })
}

// { sellerId } removes a guest and their products from the live (host only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const hostId = await requireSeller()
  if (hostId instanceof Response) return hostId
  const { id } = await params
  const guestId = str((await readJson(request))?.sellerId, 64)
  if (!guestId) return badRequest('Vendedor inválido')
  if (!(await removeGuest(hostId, id, guestId))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'products' })
  return new Response(null, { status: 204 })
}
