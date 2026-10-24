'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { Radio } from 'lucide-react'

export function BecomeSeller() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setIsLoading(true)
    setError('')
    const res = await fetch('/api/me/seller', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    } else {
      setError('Não foi possível ativar sua conta de vendedor. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <MainLayout headerProps={{ title: 'Vender ao vivo' }}>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-md shadow-card p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary flex items-center justify-center mx-auto mb-4">
            <Radio className="w-6 h-6" />
          </div>
          <h1 className="text-gray-900 font-semibold text-lg mb-1">Quer vender ao vivo?</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ative sua conta de vendedor para cadastrar produtos, agendar lives e criar leilões.
          </p>
          <Button fullWidth isLoading={isLoading} onClick={handleClick}>
            Ativar conta de vendedor
          </Button>
          {error && <p className="text-coral-pink text-sm mt-3">{error}</p>}
        </div>
      </div>
    </MainLayout>
  )
}
