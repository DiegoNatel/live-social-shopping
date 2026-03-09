'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ShoppingCart, Search, Home } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useCartStore, useNotificationStore, useUserStore } from '@/store'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/discover', label: 'Explorar', icon: Search },
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
  const { user } = useUserStore()
  const { getItemCount } = useCartStore()
  const { unreadCount } = useNotificationStore()
  const cartCount = getItemCount()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        transparent
          ? 'bg-gradient-to-b from-black/60 to-transparent'
          : 'bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Logo & Nav */}
          <div className="flex items-center gap-8">
            {showBack ? (
              <Link href="/" className="btn-icon">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <motion.div
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-white font-bold text-lg">V</span>
                </motion.div>
                <span className="font-display font-bold text-xl text-gray-900">
                  VivoBuy
                </span>
              </Link>
            )}

            {/* Navigation Links */}
            {showNav && !title && (
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
          <div className="flex items-center gap-3">
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
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-coral-pink text-white text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </Link>
            )}
            
            {showCart && (
              <Link href="/cart" className="btn-icon relative">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </Link>
            )}
            
            {showAvatar && user && (
              <Link href="/profile" className="ml-1">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                  className="ring-2 ring-gray-200 hover:ring-primary transition-all"
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
