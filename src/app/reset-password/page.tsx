import { ResetPasswordForm } from './ResetPasswordForm'

export const dynamic = 'force-dynamic'

// The e-mailed link lands here with ?token=…, or ?error=INVALID_TOKEN if it expired
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <ResetPasswordForm token={token ?? null} />
}
