// Optional secrets that `wrangler types` can't see (set with `wrangler secret put`)
interface CloudflareEnv {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  // Live video (LiveKit Cloud): wss://<project>.livekit.cloud and the project's API key
  LIVEKIT_URL?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
  // Recording lives to R2 through its S3 API (an R2 API token for the vivobuy-images bucket)
  RECORDINGS_S3_ENDPOINT?: string
  RECORDINGS_S3_ACCESS_KEY?: string
  RECORDINGS_S3_SECRET?: string
}
