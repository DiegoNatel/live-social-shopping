'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { authClient } from '@/lib/auth-client'
import { Mail } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: '/reset-password' })
    setIsLoading(false)
    if (error) return setError(error.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' : 'Não foi possível enviar. Tente novamente.')
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-md shadow-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Esqueci minha senha</h1>
        {sent ? (
          // Same answer whether or not the e-mail has an account, so nobody can probe for accounts
          <p className="text-gray-500 mt-3">
            Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Confira também o spam.
          </p>
        ) : (
          <>
            <p className="text-gray-500 mb-6">Enviaremos um link para o seu e-mail.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="E-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border border-gray-300 focus:border-sky-blue text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
                />
              </div>
              {error && <p className="text-coral-pink text-sm">{error}</p>}
              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                Enviar link
              </Button>
            </form>
          </>
        )}
        <p className="text-center mt-6">
          <Link href="/login" className="text-sky-blue font-medium hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
