'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Award,
  BarChart2,
  BookOpen,
  Check,
  Gavel,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Radio,
  Settings,
  Share2,
  ShieldCheck,
  Truck,
  Wallet,
  Bell,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { creatorPath, formatNumber } from '@/lib/utils'
import type { User } from '@/types'
import { MenuButton, MenuItem, MenuSection } from './menu'

// The profile in seller mode: a social-style header with the seller's own shop up front, and
// the seller's tools instead of the buyer's (purchases, wishlist, loyalty card).
export function SellerProfile({
  user,
  isAdmin,
  onSwitchToBuyer,
  onLogout,
}: {
  user: User
  isAdmin: boolean
  onSwitchToBuyer: () => void
  onLogout: () => void
}) {
  const [products, setProducts] = useState<number | undefined>()
  const [copied, setCopied] = useState(false)
  const shopHref = creatorPath(user.username)

  useEffect(() => {
    fetch('/api/me/stats?as=seller')
      .then(res => (res.ok ? (res.json() as Promise<{ products: number }>) : null))
      .then(data => data && setProducts(data.products))
      .catch(() => {})
  }, [])

  const share = async () => {
    const url = new URL(shopHref, window.location.origin).toString()
    try {
      if (navigator.share) await navigator.share({ title: `${user.name} na Watchhaul`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // The share sheet was closed
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header, like a social profile */}
      <section className="rounded-xl bg-white shadow-card p-5 mb-4">
        <div className="flex items-center gap-4">
          <Link href={shopHref} aria-label="Abrir minha loja" className="shrink-0">
            <Avatar src={user.avatar} alt={user.name} size="xl" isVerified={user.isVerified} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-gray-900 font-semibold text-lg truncate">{user.name}</h1>
            <p className="text-gray-500 text-sm truncate">@{user.username}</p>
            <div className="flex gap-5 mt-2">
              <Count value={products} label="produtos" />
              <Count value={user.followers} label="seguidores" />
            </div>
          </div>
        </div>
        {user.bio && <p className="text-gray-600 text-sm mt-3 whitespace-pre-line">{user.bio}</p>}

        <div className="grid grid-cols-[1fr_auto] gap-2 mt-4">
          <Link
            href="/settings#perfil"
            className="inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar perfil
          </Link>
          <button
            onClick={share}
            aria-label={copied ? 'Link copiado' : 'Compartilhar minha loja'}
            title={copied ? 'Link copiado' : 'Compartilhar minha loja'}
            className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-tropical-green" /> : <Share2 className="w-4 h-4 text-gray-700" />}
          </button>
        </div>
      </section>

      <div className="space-y-2">
        <MenuSection title="Minha loja">
          <MenuItem icon={<LayoutDashboard className="w-5 h-5" />} label="Painel de vendas" href="/seller/dashboard" />
          <MenuItem icon={<Package className="w-5 h-5" />} label="Meus produtos" href="/seller/dashboard?tab=products" />
          <MenuItem icon={<Radio className="w-5 h-5" />} label="Minhas lives" href="/seller/dashboard?tab=streams" />
          <MenuItem icon={<Gavel className="w-5 h-5" />} label="Leilões" href="/seller/dashboard?tab=auctions" />
        </MenuSection>

        <MenuSection title="Vendas e recebimentos">
          <MenuItem
            icon={<Truck className="w-5 h-5" />}
            label="Pedidos e envios"
            hint="Pedidos pagos, etiquetas e devoluções"
            href="/seller/dashboard"
          />
          <MenuItem icon={<BarChart2 className="w-5 h-5" />} label="Análises" href="/seller/dashboard?tab=analytics" />
          <MenuItem
            icon={<Wallet className="w-5 h-5" />}
            label="Recebimento e envio"
            hint="Wallet ID do Asaas e CEP de envio"
            href="/seller/settings"
          />
        </MenuSection>

        <MenuSection title="Conta">
          <MenuItem icon={<Bell className="w-5 h-5" />} label="Notificações" href="/notifications" />
          <MenuItem icon={<Settings className="w-5 h-5" />} label="Configurações" hint="Nome de usuário, dados e senha" href="/settings" />
        </MenuSection>

        <MenuSection title="Outros">
          <MenuItem icon={<BookOpen className="w-5 h-5" />} label="Guia do vendedor" href="/para-vendedores" />
          <MenuButton icon={<Award className="w-5 h-5" />} label="Mudar para modo comprador" onClick={onSwitchToBuyer} />
          {isAdmin && <MenuItem icon={<ShieldCheck className="w-5 h-5" />} label="Painel da Watchhaul" href="/admin" />}
          <MenuItem icon={<HelpCircle className="w-5 h-5" />} label="Ajuda" href="/help" />
        </MenuSection>
      </div>

      <button
        onClick={onLogout}
        className="w-full mt-6 p-4 rounded-xl bg-coral-pink/10 text-coral-pink flex items-center justify-center gap-2 hover:bg-coral-pink/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sair da conta</span>
      </button>
    </div>
  )
}

function Count({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div>
      <p className="text-gray-900 font-semibold leading-tight">{value === undefined ? '–' : formatNumber(value)}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  )
}
