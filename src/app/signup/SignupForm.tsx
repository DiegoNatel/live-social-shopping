'use client'

import { useState } from 'react'
import { useHydrated } from '@/lib/use-hydrated'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { BrandMark } from '@/components/ui/BrandMark'
import { InterestsModal } from '@/components/onboarding/InterestsModal'
import { authClient } from '@/lib/auth-client'
import { loadSession } from '@/components/auth/SessionSync'
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton'
import { cn } from '@/lib/utils'
import { ChevronLeft, Eye, EyeOff, Check, Mail, Lock, User, Phone } from 'lucide-react'


type Step = 'form' | 'interests'

export function SignupForm({ googleEnabled, next }: { googleEnabled: boolean; next: string }) {
  const router = useRouter()
  
  
  const [step, setStep] = useState<Step>('form')
  const [isLoading, setIsLoading] = useState(false)
  // Submitting before this would put the password in the address bar (see lib/use-hydrated.ts)
  const hydrated = useHydrated()
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Typing in a field clears its error, so fixed fields don't keep saying "é obrigatório"
  const update = (field: keyof typeof formData, value: string) => {
    setFormData(f => ({ ...f, [field]: value }))
    if (errors[field] || errors.form) setErrors(({ [field]: _, form: __, ...rest }) => rest)
  }

  // (11) 99999-9999 as the person types; only digits are kept
  const maskPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d.length ? `(${d}` : ''
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

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
    
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (!phoneDigits) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Telefone incompleto: inclua o DDD'
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
      phone: formData.phone.replace(/\D/g, ''),
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

    // Sellers go straight to their first product
    if (next === '/vender') {
      await loadSession()
      router.push(next)
      router.refresh()
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
    router.push(next)
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
                    className="w-12 h-12 rounded-md bg-black mx-auto mb-4 flex items-center justify-center"
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <BrandMark className="w-full h-full" />
                  </motion.div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                    {next === '/vender' ? 'Crie sua conta de vendedor' : 'Crie sua conta'}
                  </h1>
                  <p className="text-gray-500">
                    {next === '/vender'
                      ? 'Depois é só cadastrar seu primeiro produto e entrar ao vivo.'
                      : 'Compre e venda ao vivo na Watchhaul'}
                  </p>
                </div>

                {googleEnabled && (
                  <>
                    <GoogleButton label="Criar conta com Google" next={next} />
                    <OrDivider />
                  </>
                )}

                {/* Form */}
                <form method="post" onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        aria-label="Nome completo"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => update('name', e.target.value)}
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
                        name="email"
                        autoComplete="email"
                        aria-label="E-mail"
                        placeholder="E-mail"
                        value={formData.email}
                        onChange={(e) => update('email', e.target.value)}
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
                        name="phone"
                        autoComplete="tel-national"
                        inputMode="numeric"
                        aria-label="Telefone (WhatsApp)"
                        placeholder="Telefone (WhatsApp)"
                        value={formData.phone}
                        onChange={(e) => update('phone', maskPhone(e.target.value))}
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
                        name="password"
                        autoComplete="new-password"
                        aria-label="Senha"
                        aria-describedby="password-rule"
                        placeholder="Senha"
                        value={formData.password}
                        onChange={(e) => update('password', e.target.value)}
                        className={cn(
                          'w-full h-12 pl-10 pr-12 rounded-xl bg-white border text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                          errors.password ? 'border-coral-pink' : 'border-gray-300 focus:border-sky-blue'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password ? (
                      <p id="password-rule" className="text-coral-pink text-sm mt-1">{errors.password}</p>
                    ) : (
                      <p id="password-rule" className={cn('text-sm mt-1', formData.password.length >= 8 ? 'text-tropical-green' : 'text-gray-400')}>
                        Pelo menos 8 caracteres
                      </p>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={agreed}
                      aria-label="Concordo com os Termos de Uso e a Política de Privacidade"
                      onClick={() => {
                        setAgreed(!agreed)
                        if (errors.agreed) setErrors(({ agreed: _, ...rest }) => rest)
                      }}
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

                  {errors.agreed && <p className="text-coral-pink text-sm">{errors.agreed}</p>}
                  {errors.form && <p className="text-coral-pink text-sm">{errors.form}</p>}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                    disabled={!hydrated}
                    className="mt-6"
                  >
                    Criar conta
                  </Button>
                </form>

                {/* Login Link */}
                <p className="text-center text-gray-500 mt-6">
                  Já tem uma conta?{' '}
                  <Link href={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} className="text-sky-blue font-medium hover:underline">
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
                        email: 'admin@watchhaul.com',
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

