import { redirect } from 'next/navigation'
import { emailEnabled } from '@/lib/email'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  if (!emailEnabled()) redirect('/login')
  return <ForgotPasswordForm />
}
