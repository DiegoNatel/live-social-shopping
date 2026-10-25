'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency, calculateDiscount } from '@/lib/utils'
import { useUIStore } from '@/store'
import type { FlashSale } from '@/types'
import { Zap, Clock } from 'lucide-react'

interface FlashSaleTimerProps {
  flashSale: FlashSale
}

function calculateTimeLeft(endTime: Date | string) {
  const diff = Math.max(0, new Date(endTime).getTime() - Date.now())
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { days, hours, minutes, seconds, total: diff }
}

export function FlashSaleTimer({ flashSale }: FlashSaleTimerProps) {
  const { openProductModal } = useUIStore()
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(flashSale.endTime))

  const pad = (n: number) => String(n).padStart(2, '0')
  const formatted =
    timeLeft.days > 0
      ? `${timeLeft.days}d ${timeLeft.hours}h`
      : timeLeft.hours > 0
        ? `${timeLeft.hours}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
        : `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`

  const progress = ((flashSale.quantityAvailable - flashSale.quantitySold) / flashSale.quantityAvailable) * 100

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(flashSale.endTime)
      setTimeLeft(newTimeLeft)
      if (newTimeLeft.total <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [flashSale.endTime])

  const discount = calculateDiscount(flashSale.product.originalPrice || flashSale.product.price, flashSale.product.price)
  const remaining = flashSale.quantityAvailable - flashSale.quantitySold

  if (timeLeft.total <= 0) return null

  return (
    <motion.div
      className="glass rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors"
      onClick={() => openProductModal(flashSale.product)}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        {/* Product Image */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={flashSale.product.images[0]}
            alt={flashSale.product.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-1 left-1 bg-coral-pink text-white text-[10px] font-bold px-1 rounded">
            -{discount}%
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-sunset-gold fill-sunset-gold" />
            <span className="text-sunset-gold text-xs font-bold uppercase">Oferta Relâmpago</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold">
              {formatCurrency(flashSale.product.price)}
            </span>
            <span className="text-white/40 text-sm line-through">
              {formatCurrency(flashSale.product.originalPrice || 0)}
            </span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-coral-pink mb-1">
            <Clock className="w-3 h-3" />
            <span className="font-mono font-bold text-sm">
              {formatted}
            </span>
          </div>
          <span className="text-white/60 text-[10px]">Restam {remaining}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-coral-pink to-sunset-gold rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <span className="text-white/40 text-[10px]">{flashSale.quantitySold} vendidos</span>
        <span className="text-coral-pink text-[10px] font-medium">{remaining} restantes</span>
      </div>
    </motion.div>
  )
}

