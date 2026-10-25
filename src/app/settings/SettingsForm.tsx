'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormField, inputClass } from '@/components/seller/FormField'
import { authClient } from '@/lib/auth-client'
import { loadSession } from '@/components/auth/SessionSync'

interface SettingsFormProps {
  email: string
  initial: { name: string; phone: string; bio: string }
  hasPassword: boolean
}

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null
  return <p className={message.ok ? 'text-tropical-green-700 text-sm' : 'text-coral-pink text-sm'}>{message.text}</p>
}

export function SettingsForm({ email, initial, hasPassword }: SettingsFormProps) {
  const router = useRouter()
  const [profile, setProfile] = useState(initial)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', next: '' })
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [sessionsMsg, setSessionsMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.name.trim()) return setProfileMsg({ ok: false, text: 'Informe seu nome' })
    setSavingProfile(true)
    const { error } = await authClient.updateUser({
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      bio: profile.bio.trim().slice(0, 300),
    })
    setSavingProfile(false)
    if (error) return setProfileMsg({ ok: false, text: 'Não foi possível salvar' })
    setProfileMsg({ ok: true, text: 'Dados salvos' })
    await loadSession()
    router.refresh()
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.next.length < 8) return setPasswordMsg({ ok: false, text: 'A nova senha precisa de 8 caracteres ou mais' })
    setSavingPassword(true)
    const { error } = await authClient.changePassword({
      currentPassword: passwords.current,
      newPassword: passwords.next,
      revokeOtherSessions: true,
    })
    setSavingPassword(false)
    if (error) {
      return setPasswordMsg({
        ok: false,
        text: error.code === 'INVALID_PASSWORD' ? 'Senha atual incorreta' : 'Não foi possível trocar a senha',
      })
    }
    setPasswords({ current: '', next: '' })
    setPasswordMsg({ ok: true, text: 'Senha alterada. Outros aparelhos foram desconectados.' })
  }

  const signOutOthers = async () => {
    const { error } = await authClient.revokeOtherSessions()
    setSessionsMsg(error ? { ok: false, text: 'Não foi possível desconectar' } : { ok: true, text: 'Outros aparelhos desconectados' })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={saveProfile} className="bg-white rounded-md shadow-card p-6 space-y-4">
        <h2 className="text-gray-900 font-medium">Seus dados</h2>
        <FormField label="E-mail" hint="O e-mail não pode ser alterado por aqui">
          <input className={`${inputClass} bg-gray-50 text-gray-500`} value={email} disabled />
        </FormField>
        <FormField label="Nome">
          <input
            className={inputClass}
            value={profile.name}
            maxLength={100}
            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Telefone">
          <input
            className={inputClass}
            value={profile.phone}
            inputMode="tel"
            maxLength={20}
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
          />
        </FormField>
        <FormField label="Bio" hint="Aparece no seu perfil de vendedor">
          <textarea
            className={`${inputClass} h-20 py-2`}
            value={profile.bio}
            maxLength={300}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
          />
        </FormField>
        <Status message={profileMsg} />
        <div className="flex justify-end">
          <Button type="submit" isLoading={savingProfile}>
            Salvar
          </Button>
        </div>
      </form>

      {hasPassword && (
        <form onSubmit={changePassword} className="bg-white rounded-md shadow-card p-6 space-y-4">
          <h2 className="text-gray-900 font-medium">Trocar senha</h2>
          <FormField label="Senha atual">
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={passwords.current}
              onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Nova senha" hint="Pelo menos 8 caracteres">
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              required
            />
          </FormField>
          <Status message={passwordMsg} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={savingPassword}>
              Trocar senha
            </Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-md shadow-card p-6 space-y-3">
        <h2 className="text-gray-900 font-medium">Segurança</h2>
        <p className="text-gray-500 text-sm">Entrou em um computador que não é seu? Desconecte todos os outros aparelhos.</p>
        <Status message={sessionsMsg} />
        <Button variant="secondary" onClick={signOutOthers}>
          Sair dos outros aparelhos
        </Button>
      </div>
    </div>
  )
}
