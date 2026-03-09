'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { LiveBadge, ViewersBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatViewerCount } from '@/lib/utils'
import type { Stream } from '@/types'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'

interface HeroCarouselProps {
  streams: Stream[]
  autoPlay?: boolean
  interval?: number
}

export function HeroCarousel({ streams, autoPlay = true, interval = 5000 }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!autoPlay || isHovered || streams.length <= 1) return

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % streams.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, isHovered, streams.length])

  const goTo = (index: number) => {
    setCurrent(index)
  }

  const next = () => {
    setCurrent((prev) => (prev + 1) % streams.length)
  }

  const prev = () => {
    setCurrent((prev) => (prev - 1 + streams.length) % streams.length)
  }

  const stream = streams[current]
  if (!stream) return null

  return (
    <div
      className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={stream.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background */}
          <Image
            src={stream.thumbnail}
            alt={stream.title}
            fill
            className="object-cover"
            priority
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={stream.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              {stream.isLive && <LiveBadge />}
              {stream.isLive && <ViewersBadge count={stream.viewerCount} />}
              <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium capitalize">
                {stream.category}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2">
              {stream.title}
            </h2>

            {/* Host info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                src={stream.host.avatar}
                alt={stream.host.name}
                size="md"
                isVerified={stream.host.isVerified}
                isLive={stream.isLive}
              />
              <div>
                <p className="text-white font-medium">{stream.host.name}</p>
                <p className="text-white/60 text-sm">
                  {formatViewerCount(stream.host.followers)} seguidores
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link href={stream.isLive ? `/live/${stream.id}` : `/stream/${stream.id}`}>
              <Button
                leftIcon={<Play className="w-5 h-5" fill="currentColor" />}
                size="lg"
              >
                {stream.isLive ? 'Assistir Agora' : 'Ver Detalhes'}
              </Button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {streams.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {streams.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {streams.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

