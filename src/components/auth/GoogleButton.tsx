'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

// Redirects to Google; Better Auth creates the account on first login
// and links it to an existing account with the same e-mail.
export function GoogleButton({ label = 'Continuar com Google' }: { label?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setIsLoading(true)
    setError('')
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
    if (error) {
      setError('Não foi possível entrar com o Google. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full h-12 rounded-xl border border-gray-300 bg-white flex items-center justify-center gap-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        <GoogleLogo />
        {label}
      </button>
      {error && <p className="text-coral-pink text-sm mt-1">{error}</p>}
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-4 text-gray-400 text-sm">
      <div className="h-px flex-1 bg-gray-200" />
      ou
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  )
}
