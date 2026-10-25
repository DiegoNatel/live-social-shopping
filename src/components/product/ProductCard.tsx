'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency, calculateDiscount } from '@/lib/utils'
import { DiscountBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCartStore, useUIStore, useUserStore } from '@/store'
import type { Product } from '@/types'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  variant?: 'default' | 'compact' | 'horizontal'
  showAddToCart?: boolean
  index?: number
}

export function ProductCard({ 
  product, 
  variant = 'default', 
  showAddToCart = true,
  index = 0 
}: ProductCardProps) {
  const isLiked = useUserStore(s => s.favoriteIds.includes(product.id))
  const toggleFavorite = useUserStore(s => s.toggleFavorite)
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const { addItem } = useCartStore()
  const { openProductModal } = useUIStore()

  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.price) 
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem(product)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    toggleFavorite(product.id)
  }

  const handleClick = () => {
    openProductModal(product)
  }

  if (variant === 'compact') {
    return (
      <motion.div
        className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100 hover:shadow-card-hover cursor-pointer transition-shadow"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
          />
          {discount > 0 && (
            <DiscountBadge percentage={discount} className="absolute top-1 left-1 text-[10px] px-1" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-gray-900 text-sm font-medium line-clamp-1">{product.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-900 font-semibold text-sm">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-gray-400 text-xs line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddToCart}
          className="flex-shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
        </Button>
      </motion.div>
    )
  }

  if (variant === 'horizontal') {
    return (
      <motion.div
        className="flex gap-4 p-3 rounded-md bg-white shadow-card hover:shadow-card-hover cursor-pointer transition-shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-28 aspect-square rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
          />
          {discount > 0 && (
            <DiscountBadge percentage={discount} className="absolute top-2 left-2" />
          )}
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h4 className="text-gray-900 font-medium line-clamp-2 mb-1">{product.name}</h4>
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
            <Star className="w-3 h-3 fill-current" />
            <span>{product.rating}</span>
            <span className="text-gray-400">({product.reviews})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-900 font-normal text-lg">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-gray-400 text-sm line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-1">
            em até 12x de {formatCurrency(product.price / 12)}
          </p>
        </div>
      </motion.div>
    )
  }

  // Default card
  return (
    <div
      className="relative bg-white rounded-md overflow-hidden cursor-pointer group shadow-card hover:shadow-card-hover transition-shadow duration-200"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden border-b border-gray-100">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover"
        />

        {/* Like button */}
        <motion.button
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          onClick={handleLike}
          whileTap={{ scale: 0.9 }}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isLiked ? 'fill-coral-pink text-coral-pink' : 'text-gray-400'
            )}
          />
        </motion.button>

        {/* Quick add overlay - desktop */}
        {showAddToCart && (
          <div
            className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:block z-20"
          >
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleAddToCart}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              Adicionar
            </Button>
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="text-gray-700 text-sm font-normal line-clamp-2 mb-2 min-h-[40px]">
          {product.name}
        </h4>

        {/* Price */}
        {product.originalPrice && (
          <p className="text-gray-400 text-xs line-through">
            {formatCurrency(product.originalPrice)}
          </p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-gray-900 font-normal text-xl">
            {formatCurrency(product.price)}
          </span>
          {discount > 0 && (
            <span className="text-tropical-green text-sm">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Installments */}
        <p className="text-gray-600 text-xs mt-0.5">
          em até 12x de {formatCurrency(product.price / 12)}
        </p>

        {/* PIX discount */}
        <p className="text-tropical-green text-xs font-semibold mt-1">
          {formatCurrency(product.price * 0.95)} no PIX
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
          <Star className="w-3 h-3 fill-sky-blue text-sky-blue" />
          <span>{product.rating}</span>
          <span className="text-gray-400">({product.reviews})</span>
        </div>
      </div>
    </div>
  )
}

