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
  // Payments (Asaas): API key, the token Asaas sends with webhooks, and 'production' to
  // charge for real (otherwise the sandbox). ASAAS_API_URL overrides the API address (tests).
  ASAAS_API_KEY?: string
  ASAAS_WEBHOOK_TOKEN?: string
  ASAAS_ENV?: string
  ASAAS_API_URL?: string
  // Shipping quotes (Melhor Envio): personal access token, 'production' for real quotes
  // (otherwise the sandbox), the contact email Melhor Envio asks for, and an API address
  // override (tests)
  MELHOR_ENVIO_TOKEN?: string
  MELHOR_ENVIO_ENV?: string
  MELHOR_ENVIO_CONTACT?: string
  MELHOR_ENVIO_URL?: string
}
