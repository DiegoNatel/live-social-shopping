import { getImageBucket } from '@/lib/uploads'

// Serves live recordings from R2 (uploaded there by LiveKit, see lib/video.ts).
// Supports byte ranges so the player can seek and start without downloading everything.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const objectKey = `recordings/${key.join('/')}`
  const range = parseRange(request.headers.get('range'))
  let object: R2ObjectBody | null
  try {
    object = await getImageBucket().get(objectKey, range ? { range } : undefined)
  } catch {
    // R2 rejects a range past the end of the file
    return new Response(null, { status: 416 })
  }
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  if (!headers.has('content-type')) headers.set('content-type', 'video/mp4')
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  // Recording keys include the start time and are never reused
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')

  if (range) {
    const r = range as { offset?: number; length?: number; suffix?: number }
    const length =
      r.suffix !== undefined ? Math.min(r.suffix, object.size) : Math.min(r.length ?? Infinity, object.size - (r.offset ?? 0))
    const offset = r.suffix !== undefined ? object.size - length : (r.offset ?? 0)
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
    headers.set('content-length', String(length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response(object.body, { headers })
}

// "bytes=START-END" or "bytes=START-" or "bytes=-SUFFIX"; anything else plays from the start
function parseRange(header: string | null): R2Range | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!m || (!m[1] && !m[2])) return null
  if (!m[1]) return { suffix: Number(m[2]) }
  const offset = Number(m[1])
  if (m[2] && Number(m[2]) < offset) return null
  return m[2] ? { offset, length: Number(m[2]) - offset + 1 } : { offset }
}
