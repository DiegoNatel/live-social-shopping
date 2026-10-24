'use client'

import { cn, formatViewerCount } from '@/lib/utils'
import { motion } from 'framer-motion'

interface BadgeProps {
  variant?: 'live' | 'discount' | 'viewers' | 'new' | 'hot' | 'default'
  children: React.ReactNode
  className?: string
  pulse?: boolean
}

export function Badge({ variant = 'default', children, className, pulse = false }: BadgeProps) {
  const variants = {
    live: `
      bg-coral-pink text-white text-[11px] font-semibold uppercase tracking-wide
      px-2 py-0.5 rounded
    `,
    discount: `
      bg-tropical-green text-white text-xs font-semibold
      px-1.5 py-0.5 rounded
    `,
    viewers: `
      bg-black/50 text-white text-[11px] font-medium
      px-2 py-0.5 rounded
    `,
    new: `
      bg-sky-blue-50 text-sky-blue text-xs font-semibold uppercase
      px-1.5 py-0.5 rounded
    `,
    hot: `
      bg-primary-50 text-primary-700 text-xs font-semibold uppercase
      px-1.5 py-0.5 rounded
    `,
    default: `
      bg-deep-ocean-700 text-white/80 text-xs font-medium
      px-2 py-0.5 rounded-md border border-white/10
    `,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        variants[variant],
        className
      )}
    >
      {variant === 'live' && pulse && (
        <motion.span
          className="w-2 h-2 bg-white rounded-full"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {children}
    </span>
  )
}

// Specialized badges
export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge variant="live" pulse className={className}>
      AO VIVO
    </Badge>
  )
}

export function DiscountBadge({ percentage, className }: { percentage: number; className?: string }) {
  return (
    <Badge variant="discount" className={className}>
      -{percentage}%
    </Badge>
  )
}

export function ViewersBadge({ count, className }: { count: number; className?: string }) {
  return (
    <Badge variant="viewers" className={className}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path
          fillRule="evenodd"
          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clipRule="evenodd"
        />
      </svg>
      {formatViewerCount(count)}
    </Badge>
  )
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge variant="new" className={className}>
      NOVO
    </Badge>
  )
}

export function HotBadge({ className }: { className?: string }) {
  return (
    <Badge variant="hot" className={className}>
      OFERTA
    </Badge>
  )
}

