'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { InterestsModal } from '@/components/onboarding/InterestsModal'
import { authClient } from '@/lib/auth-client'
import { loadSession } from '@/components/auth/SessionSync'
import { cn } from '@/lib/utils'
import { ChevronLeft, Eye, EyeOff, Check, Mail, Lock, User, Phone } from 'lucide-react'


type Step = 'form' | 'interests'

export default function SignupPage() {
  const router = useRouter()
  
  
  const [step, setStep] = useState<Step>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório'
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres'
    }
    
    if (!agreed) {
      newErrors.agreed = 'Você precisa aceitar os termos'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    const { error } = await authClient.signUp.email({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
    })
    setIsLoading(false)

    if (error) {
      setErrors({
        form: error.code === 'USER_ALREADY_EXISTS' || error.status === 422
          ? 'Já existe uma conta com este e-mail'
          : 'Não foi possível criar a conta. Tente novamente.',
      })
      return
    }

    setStep('interests')
  }

  const handleInterestsComplete = async (interests: string[], channels: string[]) => {
    // The account already exists and is signed in; save onboarding choices
    await Promise.allSettled([
      fetch('/api/me/interests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      }),
      ...channels.map(hostId =>
        fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostId }),
        })
      ),
    ])

    await loadSession()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-page">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div
            key="form"
            className="min-h-screen flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
          >
            {/* Header */}
            <header className="p-4">
              <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
            </header>

            {/* Form Container */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <motion.div
                className="w-full max-w-md bg-white rounded-md shadow-card p-6 sm:p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Logo */}
                <div className="text-center mb-8">
                  <motion.div
                    className="w-12 h-12 rounded-md bg-primary mx-auto mb-4 flex items-center justify-center"
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className="text-white font-semibold text-xl">V</span>
                  </motion.div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                    Crie sua conta
                  </h1>
                  <p className="text-gray-500">
                    Junte-se a milhões de compradores no VivoBuy
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white border text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                          errors.name ? 'border-coral-pink' : 'border-gray-300 focus:border-sky-blue'
                        )}
                      />
                    </div>
                    {errors.name && <p className="text-coral-pink text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white border text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                          errors.email ? 'border-coral-pink' : 'border-gray-300 focus:border-sky-blue'
                        )}
                      />
                    </div>
                    {errors.email && <p className="text-coral-pink text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="Telefone (WhatsApp)"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white border text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                          errors.phone ? 'border-coral-pink' : 'border-gray-300 focus:border-sky-blue'
                        )}
                      />
                    </div>
                    {errors.phone && <p className="text-coral-pink text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-12 rounded-xl bg-white border text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                          errors.password ? 'border-coral-pink' : 'border-gray-300 focus:border-sky-blue'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-coral-pink text-sm mt-1">{errors.password}</p>}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setAgreed(!agreed)}
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                        agreed 
                          ? 'bg-tropical-green border-tropical-green' 
                          : errors.agreed 
                            ? 'border-coral-pink' 
                            : 'border-gray-300'
                      )}
                    >
                      {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <p className="text-gray-500 text-sm">
                      Concordo com os{' '}
                      <Link href="/terms" className="text-sky-blue hover:underline">
                        Termos de Uso
                      </Link>
                      {' '}e{' '}
                      <Link href="/privacy" className="text-sky-blue hover:underline">
                        Política de Privacidade
                      </Link>
                    </p>
                  </div>

                  {errors.form && <p className="text-coral-pink text-sm">{errors.form}</p>}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                    className="mt-6"
                  >
                    Criar conta
                  </Button>
                </form>

                {/* Login Link */}
                <p className="text-center text-gray-500 mt-6">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="text-sky-blue font-medium hover:underline">
                    Entrar
                  </Link>
                </p>

                {/* Dev Bypass Button */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        name: 'Admin User',
                        email: 'admin@vivobuy.com',
                        phone: '11999999999',
                        password: '123456',
                      })
                      setStep('interests')
                    }}
                    className="w-full mt-4 py-2 px-4 text-xs text-gray-300 hover:text-gray-500 border border-dashed border-gray-300 hover:border-gray-300 rounded-lg transition-colors"
                  >
                    🔧 Dev: Pular para Interesses
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interests Modal */}
      <InterestsModal 
        open={step === 'interests'} 
        onComplete={handleInterestsComplete}
      />
    </div>
  )
}

