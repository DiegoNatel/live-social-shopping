import { isGoogleEnabled } from '@/lib/auth'
import { emailEnabled } from '@/lib/email'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm googleEnabled={isGoogleEnabled()} canRecoverPassword={emailEnabled()} />
}
