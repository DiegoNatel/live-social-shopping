'use client'

import { Header } from './Header'
import { Footer } from './Footer'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showNav?: boolean
  headerProps?: Parameters<typeof Header>[0]
  className?: string
  fullHeight?: boolean
  // Links to help, terms and selling at the bottom (off on full-screen pages and checkout)
  showFooter?: boolean
}

export function MainLayout({
  children,
  showHeader = true,
  showNav = true,
  headerProps,
  className,
  fullHeight = false,
  showFooter = true,
}: MainLayoutProps) {
  return (
    <div className={cn(
      'min-h-screen bg-page',
      fullHeight && 'h-screen overflow-hidden'
    )}>
      {showHeader && <Header showNav={showNav} {...headerProps} />}
      <main
        className={cn(
          showHeader && 'pt-16',
          className
        )}
      >
        {children}
      </main>
      {showFooter && !fullHeight && <Footer />}
    </div>
  )
}
