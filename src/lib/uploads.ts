import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Seller uploads live in R2 under u/<userId>/ and are served from /images/<key>
export const IMAGE_PATH_PREFIX = '/images/'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// Detected from the file's first bytes, not the browser-supplied type.
// SVG is left out on purpose: it can carry scripts.
const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', ext: 'jpg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/gif', ext: 'gif', test: b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    type: 'image/webp',
    ext: 'webp',
    test: b =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
]

export function detectImageType(bytes: Uint8Array) {
  return SIGNATURES.find(s => s.test(bytes)) ?? null
}

export function getImageBucket(): R2Bucket {
  return getCloudflareContext().env.UPLOADS
}

export async function saveImage(userId: string, data: ArrayBuffer) {
  const kind = detectImageType(new Uint8Array(data, 0, Math.min(16, data.byteLength)))
  if (!kind) return null
  const key = `u/${userId}/${crypto.randomUUID()}.${kind.ext}`
  await getImageBucket().put(key, data, { httpMetadata: { contentType: kind.type } })
  return `${IMAGE_PATH_PREFIX}${key}`
}
