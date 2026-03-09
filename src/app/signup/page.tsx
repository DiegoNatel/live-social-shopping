'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { InterestsModal } from '@/components/onboarding/InterestsModal'
import { useUserStore } from '@/store'
import { cn } from '@/lib/utils'
import { ChevronLeft, Eye, EyeOff, Check, Mail, Lock, User, Phone } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/Icons'

type Step = 'form' | 'interests'

export default function SignupPage() {
  const router = useRouter()
  const { login } = useUserStore()
  
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres'
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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setStep('interests')
  }

  const handleInterestsComplete = (interests: string[], channels: string[]) => {
    // Create user with interests
    const newUser = {
      id: `user-${Date.now()}`,
      name: formData.name,
      username: formData.email.split('@')[0],
      avatar: `https://i.pravatar.cc/150?u=${formData.email}`,
      isVerified: false,
      followers: 0,
      following: channels.length,
      bio: '',
    }
    
    // Log the user in
    login(newUser)
    
    // Redirect to home
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-ocean via-deep-ocean-800 to-purple-glow/30">
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
              <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar</span>
              </Link>
            </header>

            {/* Form Container */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <motion.div
                className="w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Logo */}
                <div className="text-center mb-8">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tropical-green to-sky-blue mx-auto mb-4 flex items-center justify-center shadow-lg"
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <span className="text-white font-bold text-2xl">V</span>
                  </motion.div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Crie sua conta
                  </h1>
                  <p className="text-white/60">
                    Junte-se a milhões de compradores no VivoBuy
                  </p>
                </div>

                {/* Social Login */}
                <div className="space-y-3 mb-6">
                  <button className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continuar com Google</span>
                  </button>
                  
                  <button className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-[#25D366] text-white font-medium hover:bg-[#128C7E] transition-colors">
                    <WhatsAppIcon className="w-5 h-5" />
                    <span>Continuar com WhatsApp</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/40 text-sm">ou</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 border text-white placeholder:text-white/40 outline-none transition-colors',
                          errors.name ? 'border-coral-pink' : 'border-white/20 focus:border-tropical-green'
                        )}
                      />
                    </div>
                    {errors.name && <p className="text-coral-pink text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 border text-white placeholder:text-white/40 outline-none transition-colors',
                          errors.email ? 'border-coral-pink' : 'border-white/20 focus:border-tropical-green'
                        )}
                      />
                    </div>
                    {errors.email && <p className="text-coral-pink text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="tel"
                        placeholder="Telefone (WhatsApp)"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 border text-white placeholder:text-white/40 outline-none transition-colors',
                          errors.phone ? 'border-coral-pink' : 'border-white/20 focus:border-tropical-green'
                        )}
                      />
                    </div>
                    {errors.phone && <p className="text-coral-pink text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={cn(
                          'w-full h-12 pl-10 pr-12 rounded-xl bg-white/10 border text-white placeholder:text-white/40 outline-none transition-colors',
                          errors.password ? 'border-coral-pink' : 'border-white/20 focus:border-tropical-green'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
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
                            : 'border-white/40'
                      )}
                    >
                      {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <p className="text-white/60 text-sm">
                      Concordo com os{' '}
                      <Link href="/terms" className="text-tropical-green hover:underline">
                        Termos de Uso
                      </Link>
                      {' '}e{' '}
                      <Link href="/privacy" className="text-tropical-green hover:underline">
                        Política de Privacidade
                      </Link>
                    </p>
                  </div>

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
                <p className="text-center text-white/60 mt-6">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="text-tropical-green font-medium hover:underline">
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
                    className="w-full mt-4 py-2 px-4 text-xs text-white/30 hover:text-white/60 border border-dashed border-white/20 hover:border-white/40 rounded-lg transition-colors"
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

