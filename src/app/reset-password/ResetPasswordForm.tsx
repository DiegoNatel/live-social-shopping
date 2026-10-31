'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { authClient } from '@/lib/auth-client'
import { Lock } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [expired, setExpired] = useState(!token)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`)
    setIsLoading(true)
    setError('')
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! })
    setIsLoading(false)
    if (error) {
      if (error.code === 'INVALID_TOKEN') return setExpired(true)
      return setError('Não foi possível salvar. Tente novamente.')
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-md shadow-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Nova senha</h1>
        {done ? (
          <>
            <p className="text-gray-500 mt-3 mb-6">Senha alterada. Por segurança, saímos da sua conta em todos os aparelhos.</p>
            <Link href="/login" className="text-sky-blue font-medium hover:underline">
              Entrar
            </Link>
          </>
        ) : expired ? (
          <>
            <p className="text-gray-500 mt-3 mb-6">Este link expirou ou já foi usado.</p>
            <Link href="/forgot-password" className="text-sky-blue font-medium hover:underline">
              Pedir outro link
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Nova senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border border-gray-300 focus:border-sky-blue text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
              />
            </div>
            {error && <p className="text-coral-pink text-sm">{error}</p>}
            <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
              Salvar senha
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
