import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { SettingsForm } from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/settings')
  const db = getDb()
  const [profile, credential] = await Promise.all([
    db.prepare('SELECT name, phone, bio, username FROM users WHERE id = ?').bind(session.user.id).first<Record<string, string | null>>(),
    // Google-only accounts have no password to change
    db
      .prepare(`SELECT 1 AS ok FROM accounts WHERE user_id = ? AND provider_id = 'credential'`)
      .bind(session.user.id)
      .first<number>('ok'),
  ])

  return (
    <MainLayout headerProps={{ title: 'Configurações' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <SettingsForm
          email={session.user.email}
          initial={{ name: profile?.name ?? '', phone: profile?.phone ?? '', bio: profile?.bio ?? '' }}
          username={profile?.username ?? ''}
          hasPassword={!!credential}
        />
      </div>
    </MainLayout>
  )
}

export const metadata: Metadata = { title: 'Configurações' }
