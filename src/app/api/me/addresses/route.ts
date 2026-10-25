import { getSession } from '@/lib/auth'
import { addAddress, listAddresses, parseAddress } from '@/lib/addresses'
import { badRequest, readJson } from '@/lib/validate'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await listAddresses(session.user.id))
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const b = await readJson(request)
  const address = b && parseAddress(b)
  if (!address) return badRequest('Endereço incompleto')
  const id = await addAddress(session.user.id, address, b.isDefault === true)
  if (!id) return badRequest('Você pode salvar até 10 endereços')
  return Response.json({ id }, { status: 201 })
}
