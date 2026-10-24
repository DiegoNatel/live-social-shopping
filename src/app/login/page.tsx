'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { authClient } from '@/lib/auth-client'
import { loadSession } from '@/components/auth/SessionSync'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock,
} from 'lucide-react'


export default function LoginPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-deep-ocean via-deep-ocean-800 to-purple-glow/30">
      <motion.div
        className="min-h-screen flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
                Bem-vindo de volta!
              </h1>
              <p className="text-white/60">
                Entre na sua conta VivoBuy
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-center text-white/60 mt-6">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-tropical-green font-medium hover:underline">
                Criar conta
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

