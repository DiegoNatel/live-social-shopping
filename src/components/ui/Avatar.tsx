'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface AvatarProps {
  src?: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isVerified?: boolean
  isLive?: boolean
  className?: string
}

const sizes = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const verifiedSizes = {
  xs: 'h-3 w-3 -bottom-0.5 -right-0.5',
  sm: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
  md: 'h-4 w-4 -bottom-0.5 -right-0.5',
  lg: 'h-5 w-5 -bottom-1 -right-1',
  xl: 'h-6 w-6 -bottom-1 -right-1',
}

export function Avatar({
  src,
  alt,
  size = 'md',
  isVerified = false,
  isLive = false,
  className,
}: AvatarProps) {
  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('relative inline-flex rounded-full', className)}>
      {/* Live ring animation */}
      {isLive && (
        <span className="absolute inset-0 rounded-full border-2 border-coral-pink animate-ping opacity-75" />
      )}
      
      <AvatarPrimitive.Root
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          sizes[size],
          isLive && 'ring-2 ring-coral-pink'
        )}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-tropical-green to-sky-blue text-white font-medium"
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {/* Verified badge */}
      {isVerified && (
        <span
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-tropical-green text-white',
            verifiedSizes[size]
          )}
        >
          <Check className="h-2/3 w-2/3" strokeWidth={3} />
        </span>
      )}
    </div>
  )
}

// Avatar group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ avatar?: string; name: string }>
  max?: number
  size?: 'xs' | 'sm' | 'md'
}

export function AvatarGroup({ users, max = 3, size = 'sm' }: AvatarGroupProps) {
  const displayed = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className="flex -space-x-2">
      {displayed.map((user, index) => (
        <Avatar
          key={index}
          src={user.avatar}
          alt={user.name}
          size={size}
          className="ring-2 ring-deep-ocean"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-deep-ocean-700 text-white text-xs font-medium ring-2 ring-deep-ocean',
            sizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

