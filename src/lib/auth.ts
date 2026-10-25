import 'server-only'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers } from 'next/headers'
import { hashPassword, verifyPassword } from './password'

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' }

const googleConfigured = (env: CloudflareEnv) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

export function isGoogleEnabled() {
  return googleConfigured(getCloudflareContext().env)
}

function createAuth(env: CloudflareEnv) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    // Enabled once GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set
    socialProviders: googleConfigured(env)
      ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! } }
      : undefined,
    user: {
      modelName: 'users',
      fields: { emailVerified: 'email_verified', image: 'avatar', ...timestamps },
      additionalFields: {
        username: { type: 'string', required: false, input: false },
        phone: { type: 'string', required: false },
        bio: { type: 'string', required: false },
        isSeller: { type: 'boolean', fieldName: 'is_seller', required: false, input: false, defaultValue: false },
        isVerified: { type: 'boolean', fieldName: 'is_verified', required: false, input: false, defaultValue: false },
      },
    },
    session: {
      modelName: 'sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        ...timestamps,
      },
      // Avoid a D1 read on every request; the session is re-checked every 5 minutes
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      modelName: 'accounts',
      // Google verifies e-mails, so logging in with Google joins an existing e-mail/password account
      accountLinking: { enabled: true, trustedProviders: ['google'] },
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        ...timestamps,
      },
    },
    verification: {
      modelName: 'verifications',
      fields: { expiresAt: 'expires_at', ...timestamps },
    },
    databaseHooks: {
      user: {
        create: {
          // users.username is required and unique; derive one from the email
          before: async user => {
            const base = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user'
            const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4)
            return { data: { ...user, username: `${base}_${suffix}` } }
          },
        },
      },
    },
    plugins: [nextCookies()],
  })
}

export type Auth = ReturnType<typeof createAuth>

// One instance per Worker isolate (env is stable within an isolate)
const cache = new WeakMap<CloudflareEnv, Auth>()

export function getAuth(): Auth {
  const { env } = getCloudflareContext()
  let auth = cache.get(env)
  if (!auth) {
    auth = createAuth(env)
    cache.set(env, auth)
  }
  return auth
}

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() })
}
