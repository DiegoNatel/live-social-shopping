'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ShoppingCart, Search, Home, LayoutDashboard, PackagePlus, Radio, Store } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useCartStore, useNotificationStore, useUserStore } from '@/store'
import { cn } from '@/lib/utils'
import { useMode } from './ModeProvider'

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/discover', label: 'Explorar', icon: Search },
]

// Seller mode: the seller's own tools, plus a way to see the shop as buyers do
const sellerNavItems = [
  { href: '/seller/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/seller/products/new', label: 'Novo produto', icon: PackagePlus },
  { href: '/seller/streams/new', label: 'Nova live', icon: Radio },
  { href: '/', label: 'Ver loja', icon: Store },
]

interface HeaderProps {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  showCart?: boolean
  showNotifications?: boolean
  showAvatar?: boolean
  showNav?: boolean
  transparent?: boolean
  className?: string
}

export function Header({
  title,
  showBack = false,
  showSearch = false,
  showCart = true,
  showNotifications = true,
  showAvatar = true,
  showNav = true,
  transparent = false,
  className,
}: HeaderProps) {
  const pathname = usePathname()
  const { mode } = useMode()
  const seller = mode === 'seller'
  const home = seller ? '/seller/dashboard' : '/'
  const items = seller ? sellerNavItems : navItems
  const { user } = useUserStore()
  const { getItemCount } = useCartStore()
  const { unreadCount } = useNotificationStore()
  // The saved cart only exists in the browser; render the count after mount so the
  // first client render matches the server HTML (avoids a hydration mismatch)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const cartCount = mounted ? getItemCount() : 0

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        transparent
          ? 'bg-gradient-to-b from-black/60 to-transparent'
          : 'bg-white border-b border-gray-200',
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left section - Logo & Nav */}
          <div className="flex items-center gap-3 sm:gap-8">
            {showBack ? (
              <Link href={home} className="btn-icon">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <Link href={home} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">V</span>
                </div>
                {/* In seller mode the phone header needs the room for the seller menu */}
                <span className={cn('font-semibold text-lg text-gray-900', seller && 'hidden sm:inline')}>
                  VivoBuy
                </span>
                {seller && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">Vendedor</span>
                )}
              </Link>
            )}

            {/* Navigation Links */}
            {showNav && !title && (
              <nav className="flex items-center gap-1">
                {items.map((item) => {
                  const isActive = pathname === item.href
                  // Icons only on phones: a label for screen readers and hover
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className={cn(
                        'relative flex items-center gap-2 px-2 sm:px-3 py-2 rounded-md font-medium transition-colors text-sm',
                        isActive
                          ? 'text-gray-900'
                          : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </nav>
            )}

            {title && (
              <h1 className="font-semibold text-gray-900 truncate max-w-[300px]">
                {title}
              </h1>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showSearch && (
              <Link href="/search" className="btn-icon">
                <Search className="w-5 h-5 text-gray-600" />
              </Link>
            )}
            
            {showNotifications && (
              <Link href="/notifications" className="btn-icon relative">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-sky-blue text-white text-[10px] font-semibold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </Link>
            )}
            
            {showCart && (
              <Link href="/cart" className={cn('btn-icon relative', seller && 'hidden sm:flex')}>
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-sky-blue text-white text-[10px] font-semibold rounded-full flex items-center justify-center"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </Link>
            )}
            
            {showAvatar && user && (
              <Link href="/profile" className="sm:ml-1">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                  className="ring-1 ring-gray-200"
                />
              </Link>
            )}

            {showAvatar && !user && (
              <Link
                href="/login"
                className="ml-1 px-3 py-1.5 rounded-md text-sm font-medium text-sky-blue hover:bg-sky-blue-50 transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
