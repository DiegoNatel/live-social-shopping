'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { useMode } from '@/components/layout/ModeProvider'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useUserStore } from '@/store'
import { authClient } from '@/lib/auth-client'
import { formatNumber, formatCurrency } from '@/lib/utils'
import {
  Settings,
  ChevronRight,
  ShoppingBag,
  Heart,
  Bell,
  CreditCard,
  MapPin,
  HelpCircle,
  LogOut,
  Crown,
  Gift,
  Star,
  Users,
  Award,
  Flame,
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user, followedHosts, setSession, isSeller } = useUserStore()
  const { mode, setMode } = useMode()
  const switchMode = () => {
    const next = mode === 'seller' ? 'buyer' : 'seller'
    setMode(next)
    router.push(next === 'seller' ? '/seller/dashboard' : '/')
  }
  // Watch time and points aren't tracked yet
  const [stats, setStats] = useState({ purchases: 0, totalSpent: 0, watchTime: 0, points: 0 })

  useEffect(() => {
    if (!user) return
    fetch('/api/me/stats')
      .then(res => (res.ok ? (res.json() as Promise<{ purchases: number; totalSpent: number }>) : null))
      .then(data => {
        if (data) setStats(s => ({ ...s, ...data, points: Math.floor(data.totalSpent) }))
      })
  }, [user])

  const handleLogout = async () => {
    await authClient.signOut()
    setSession(null)
    setMode('buyer')
    router.push('/')
    router.refresh()
  }

  if (!user) {
    return (
      <MainLayout headerProps={{ title: 'Perfil' }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <h2 className="text-gray-900 text-xl font-semibold mb-2">Faça login</h2>
          <p className="text-gray-500 mb-6">
            Entre para aproveitar todas as funcionalidades
          </p>
          <Link href="/login">
            <Button>Entrar</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout headerProps={{ title: 'Meu Perfil', showAvatar: false }}>
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <Avatar
            src={user.avatar}
            alt={user.name}
            size="xl"
            isVerified={user.isVerified}
            className="mx-auto mb-3"
          />
          <h1 className="text-gray-900 font-semibold text-xl">{user.name}</h1>
          <p className="text-gray-500">@{user.username}</p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-gray-900 font-semibold">{formatNumber(user.followers)}</p>
              <p className="text-gray-400 text-xs">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-semibold">{formatNumber(user.following)}</p>
              <p className="text-gray-400 text-xs">Seguindo</p>
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-semibold">{stats.purchases}</p>
              <p className="text-gray-400 text-xs">Compras</p>
            </div>
          </div>
        </div>

        {/* Loyalty Card */}
        <motion.div
          className="relative overflow-hidden rounded-md bg-white shadow-card p-4 mb-6"
          
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-sunset-gold" />
                <span className="text-gray-900 font-semibold">VivoBuy Gold</span>
              </div>
              <span className="text-gray-700 text-sm">{stats.points} pts</span>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-1">Total gasto</p>
                <p className="text-gray-900 font-bold text-xl">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">Próximo nível</p>
                <p className="text-gray-900 font-semibold">Platinum</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-sunset-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.totalSpent / 5000) * 100)}%` }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Faltam {formatCurrency(5000 - stats.totalSpent)} para Platinum
            </p>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gray-100 rounded-full blur-xl" />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            value={stats.purchases.toString()}
            label="Compras"
            color="tropical-green"
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            value={`${stats.watchTime}h`}
            label="Assistidas"
            color="coral-pink"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={followedHosts.length.toString()}
            label="Seguindo"
            color="sky-blue"
          />
        </div>

        {/* Menu */}
        <div className="space-y-2">
          <MenuSection title="Compras">
            <MenuItem
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Meus Pedidos"
              href="/orders"
            />
            <MenuItem
              icon={<Heart className="w-5 h-5" />}
              label="Lista de Desejos"
              href="/wishlist"
            />
            <MenuItem
              icon={<Star className="w-5 h-5" />}
              label="Minhas Avaliações"
              href="/reviews"
            />
          </MenuSection>

          <MenuSection title="Conta">
            <MenuItem
              icon={<CreditCard className="w-5 h-5" />}
              label="Formas de Pagamento"
              href="/payment-methods"
            />
            <MenuItem
              icon={<MapPin className="w-5 h-5" />}
              label="Endereços"
              href="/addresses"
            />
            <MenuItem
              icon={<Bell className="w-5 h-5" />}
              label="Notificações"
              href="/notifications"
            />
            <MenuItem
              icon={<Settings className="w-5 h-5" />}
              label="Configurações"
              href="/settings"
            />
          </MenuSection>

          <MenuSection title="Outros">
            <MenuItem
              icon={<Gift className="w-5 h-5" />}
              label="Convide amigos"
              href="/referral"
              badge="Novo"
            />
            {isSeller ? (
              <MenuButton
                icon={<Award className="w-5 h-5" />}
                label={mode === 'seller' ? 'Voltar ao modo comprador' : 'Entrar no modo vendedor'}
                onClick={switchMode}
              />
            ) : (
              <MenuItem
                icon={<Award className="w-5 h-5" />}
                label="Seja um Vendedor"
                href="/seller/dashboard"
              />
            )}
            <MenuItem
              icon={<HelpCircle className="w-5 h-5" />}
              label="Ajuda"
              href="/help"
            />
          </MenuSection>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 p-4 rounded-xl bg-coral-pink/10 text-coral-pink flex items-center justify-center gap-2 hover:bg-coral-pink/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da conta</span>
        </button>
      </div>
    </MainLayout>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode
  value: string
  label: string
  color: string
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-card p-3 text-center">
      <div className="text-gray-400 mb-1 flex justify-center">{icon}</div>
      <p className="text-gray-900 font-bold text-lg">{value}</p>
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
  )
}

// Menu Section Component
function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-card overflow-hidden">
      <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wide px-4 py-2 bg-gray-50 border-b border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  )
}

// Menu Item Component
// Like MenuItem, for an action instead of a link
function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
      <div className="flex items-center gap-3">
        <span className="text-gray-500">{icon}</span>
        <span className="text-gray-900">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  href: string
  badge?: string
}

function MenuItem({ icon, label, href, badge }: MenuItemProps) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">{icon}</span>
          <span className="text-gray-900">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-sky-blue-50 text-sky-blue text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </Link>
  )
}

