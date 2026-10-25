// Small helpers for validating JSON request bodies
export const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

export const int = (v: unknown, min: number, max: number) => {
  const n = num(v, min, max)
  return n !== null && Number.isInteger(n) ? n : null
}

export const strList = (v: unknown, maxItems: number, maxLen = 60) =>
  Array.isArray(v) ? v.map(x => str(x, maxLen)).filter((x): x is string => !!x).slice(0, maxItems) : []

// Only absolute https URLs (images are hotlinked until uploads to R2 exist)
export const httpsUrls = (v: unknown, maxItems: number) =>
  strList(v, maxItems, 500).filter(u => {
    try {
      return new URL(u).protocol === 'https:'
    } catch {
      return false
    }
  })

export const isoDate = (v: unknown) => {
  const s = str(v, 40)
  const d = s ? new Date(s) : null
  return d && !isNaN(d.getTime()) ? d.toISOString() : null
}

export const badRequest = (message: string) => Response.json({ error: 'INVALID', message }, { status: 400 })

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}
