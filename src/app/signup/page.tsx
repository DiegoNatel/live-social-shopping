import { isGoogleEnabled } from '@/lib/auth'
import { SignupForm } from './SignupForm'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleEnabled()} />
}
