import { logError } from '@/lib/errors'
import { str } from '@/lib/validate'

// A page broke in someone's browser: { message, path }. Open to anyone, like the error page
// itself, so it stores short text only.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown; path?: unknown } | null
  const message = str(body?.message, 300)
  if (message) await logError('pagina', message, str(body?.path, 200))
  return new Response(null, { status: 204 })
}
