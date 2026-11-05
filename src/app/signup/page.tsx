import type { Metadata } from 'next'
import { isGoogleEnabled } from '@/lib/auth'
import { safeNext } from '@/lib/utils'
import { SignupForm } from './SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return <SignupForm googleEnabled={isGoogleEnabled()} next={safeNext(next)} />
}

export const metadata: Metadata = { title: 'Criar conta' }
