import type { Metadata } from 'next'
import { ResetPasswordForm } from './ResetPasswordForm'
import { getDb } from '@/lib/db'

// Whether the e-mailed token still works (better-auth keeps it as "reset-password:<token>"), so an
// old link says so before the person types a new password
async function tokenIsValid(token: string) {
  const row = await getDb()
    .prepare('SELECT expires_at FROM verifications WHERE identifier = ?')
    .bind(`reset-password:${token}`)
    .first<{ expires_at: string }>()
  if (!row) return false
  const raw = row.expires_at
  const expires = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw)
  return isNaN(expires) || expires > Date.now()
}

export const dynamic = 'force-dynamic'

// The e-mailed link lands here with ?token=…, or ?error=INVALID_TOKEN if it expired
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) return <ResetPasswordForm token={null} problem="missing" />
  const valid = await tokenIsValid(token).catch(() => true)
  return <ResetPasswordForm token={valid ? token : null} problem={valid ? undefined : 'expired'} />
}

export const metadata: Metadata = { title: 'Nova senha' }
