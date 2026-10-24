'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { LiveBadge, ViewersBadge } from '@/components/ui/Badge'
import { formatViewerCount, formatRelativeTime, cn } from '@/lib/utils'
import type { Stream } from '@/types'
import { Clock, Users, Play } from 'lucide-react'

interface StreamCardProps {
  stream: Stream
  variant?: 'default' | 'large' | 'horizontal' | 'creator-first'
  index?: number
}

// Hover lift animation variants
const liftVariants = {
  initial: { 
    y: 0, 
    scale: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  hover: {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    }
  },
  tap: { 
    scale: 0.98,
    y: -4,
  }
}

// Live stream gets extra emphasis with glow
const liveLiftVariants = {
  initial: {
    y: 0,
    scale: 1,
    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
  },
  hover: {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    }
  },
  tap: { 
    scale: 0.98,
    y: -6,
  }
}

export function StreamCard({ stream, variant = 'default', index = 0 }: StreamCardProps) {
  const { id, title, host, thumbnail, isLive, viewerCount, scheduledTime, category } = stream

  if (variant === 'horizontal') {
    return (
      <Link href={isLive ? `/live/${id}` : `/stream/${id}`}>
        <motion.div
          className="flex gap-3 p-3 rounded-md bg-white shadow-card hover:shadow-card-hover transition-shadow"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Thumbnail */}
          <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover"
            />
            {isLive ? (
              <LiveBadge className="absolute top-2 left-2" />
            ) : (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white/80" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
              {title}
            </h3>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Avatar src={host.avatar} alt={host.name} size="xs" />
              <span className="truncate">{host.name}</span>
            </div>
            {isLive ? (
              <div className="flex items-center gap-1 text-coral-pink text-xs mt-1">
                <Users className="w-3 h-3" />
                <span>{formatViewerCount(viewerCount)} assistindo</span>
              </div>
            ) : scheduledTime && (
              <div className="text-gray-400 text-xs mt-1">
                {formatRelativeTime(scheduledTime)}
              </div>
            )}
          </div>
        </motion.div>
      </Link>
    )
  }

  if (variant === 'large') {
    return (
      <Link href={isLive ? `/live/${id}` : `/stream/${id}`}>
        <motion.div
          className="relative aspect-[16/9] rounded-2xl overflow-hidden group"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Background image */}
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-card" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isLive && <LiveBadge />}
            <span className="px-2 py-1 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
              {category}
            </span>
          </div>
          
          {isLive && (
            <ViewersBadge count={viewerCount} className="absolute top-3 right-3" />
          )}
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-white text-lg mb-2 line-clamp-2">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <Avatar src={host.avatar} alt={host.name} size="sm" isVerified={host.isVerified} isLive={isLive} />
              <div>
                <span className="text-white text-sm font-medium">{host.name}</span>
                <p className="text-white/60 text-xs">
                  {formatViewerCount(host.followers)} seguidores
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    )
  }

  // Creator-first variant - emphasizes the creator at the top
  if (variant === 'creator-first') {
    return (
      <Link href={isLive ? `/live/${id}` : `/stream/${id}`}>
        <motion.div
          className={cn(
            "relative rounded-2xl overflow-hidden bg-white border border-gray-100 group transition-all shadow-sm",
            isLive && "border-coral-pink/30"
          )}
          initial="initial"
          animate={{ opacity: 1, y: 0 }}
          whileHover="hover"
          whileTap="tap"
          variants={isLive ? liveLiftVariants : liftVariants}
          transition={{ delay: index * 0.1 }}
        >
          {/* Creator Header - TOP EMPHASIS */}
          <div className="p-4 pb-3 flex items-center gap-3">
            {/* Clean circular avatar */}
            <Avatar
              src={host.avatar}
              alt={host.name}
              size="md"
              className={cn(
                false && ''
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 truncate">{host.name}</span>
                {host.isVerified && (
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-gray-500 text-xs">{formatViewerCount(host.followers)} seguidores</span>
            </div>
            {isLive ? (
              <span className="px-2 py-0.5 bg-coral-pink text-white text-[11px] font-semibold rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Em breve
              </span>
            )}
          </div>

          {/* Stream Thumbnail */}
          <div className="relative aspect-video mx-4 mb-3 rounded-xl overflow-hidden">
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {isLive && (
              <ViewersBadge count={viewerCount} className="absolute top-2 right-2" />
            )}
            
            {/* Play overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
          </div>

          {/* Stream Info */}
          <div className="px-4 pb-4">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
              {title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 text-xs">
                {category}
              </span>
              {stream.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-gray-400 text-xs">#{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </Link>
    )
  }

  // Default card variant
  return (
    <Link href={isLive ? `/live/${id}` : `/stream/${id}`}>
      <motion.div
        className={cn(
          "relative aspect-[9/16] rounded-md overflow-hidden group"
        )}
        initial="initial"
        animate={{ opacity: 1, y: 0 }}
        whileHover="hover"
        whileTap="tap"
        variants={isLive ? liveLiftVariants : liftVariants}
        transition={{ delay: index * 0.1 }}
      >
        {/* Background image */}
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          {isLive ? (
            <LiveBadge />
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs">
              <Clock className="w-3 h-3" />
              <span>Em breve</span>
            </div>
          )}
          {isLive && <ViewersBadge count={viewerCount} />}
        </div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-medium text-white text-sm mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <Avatar src={host.avatar} alt={host.name} size="xs" isVerified={host.isVerified} />
            <span className="text-white/80 text-xs truncate">{host.name}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

