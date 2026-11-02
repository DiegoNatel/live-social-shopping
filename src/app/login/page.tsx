import { isGoogleEnabled } from '@/lib/auth'
import { emailEnabled } from '@/lib/email'
import { safeNext } from '@/lib/utils'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return <LoginForm googleEnabled={isGoogleEnabled()} canRecoverPassword={emailEnabled()} next={safeNext(next)} />
}
