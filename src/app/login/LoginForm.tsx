'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { authClient } from '@/lib/auth-client'
import { loadSession } from '@/components/auth/SessionSync'
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock,
} from 'lucide-react'


export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    const { error } = await authClient.signIn.email({
      email: formData.email.trim(),
      password: formData.password,
    })

    if (error) {
      setErrors({
        form: error.status === 401 ? 'E-mail ou senha incorretos' : 'Não foi possível entrar. Tente novamente.',
      })
      setIsLoading(false)
      return
    }

    await loadSession()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-page">
      <motion.div
        className="min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
                Bem-vindo de volta!
              </h1>
              <p className="text-gray-500">
                Entre na sua conta VivoBuy
              </p>
            </div>

            {googleEnabled && (
              <>
                <GoogleButton label="Continuar com Google" />
                <OrDivider />
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {errors.form && <p className="text-coral-pink text-sm">{errors.form}</p>}

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
              >
                Entrar
              </Button>
            </form>

            {/* Register Link */}
            <p className="text-center text-gray-500 mt-6">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-sky-blue font-medium hover:underline">
                Criar conta
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

