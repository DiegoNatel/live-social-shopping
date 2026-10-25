// Optional secrets that `wrangler types` can't see (set with `wrangler secret put`)
interface CloudflareEnv {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}
