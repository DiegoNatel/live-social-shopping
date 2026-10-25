import { getSession } from '@/lib/auth'
import { deleteAddress, setDefaultAddress } from '@/lib/addresses'

type Params = { params: Promise<{ id: string }> }

// PATCH makes the address the default
export async function PATCH(_request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const ok = await setDefaultAddress(session.user.id, (await params).id)
  return new Response(null, { status: ok ? 204 : 404 })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const ok = await deleteAddress(session.user.id, (await params).id)
  return new Response(null, { status: ok ? 204 : 404 })
}
