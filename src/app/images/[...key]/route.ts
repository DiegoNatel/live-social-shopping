import { getImageBucket } from '@/lib/uploads'

// Serves uploaded images from R2. Keys are random UUIDs and never reused, so they cache forever.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const object = await getImageBucket().get(key.join('/'))
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')
  return new Response(object.body, { headers })
}
