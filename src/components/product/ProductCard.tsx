'use client'

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency, calculateDiscount } from '@/lib/utils'
import { DiscountBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCartStore, useUIStore } from '@/store'
import type { Product } from '@/types'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
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
  const [isLiked, setIsLiked] = useState(false)
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
    setIsLiked(!isLiked)
  }

  const handleClick = () => {
    openProductModal(product)
  }

  if (variant === 'compact') {
    return (
      <motion.div
        className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100 hover:border-primary/30 hover:shadow-md cursor-pointer transition-all"
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
            <span className="text-primary font-semibold text-sm">
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
        className="flex gap-4 p-3 rounded-xl bg-white border border-gray-100 hover:border-primary/30 hover:shadow-lg cursor-pointer transition-all"
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
          <div className="flex items-center gap-1 text-amber-500 text-sm mb-2">
            <Star className="w-3 h-3 fill-current" />
            <span>{product.rating}</span>
            <span className="text-gray-400">({product.reviews})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-primary font-bold text-lg">
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

  // Default card with 3D tilt effect
  const cardRef = useRef<HTMLDivElement>(null)
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 })
  
  // Motion values for smooth 3D tilt
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  
  const rotateX = useTransform(mouseY, [0, 1], [8, -8])
  const rotateY = useTransform(mouseX, [0, 1], [-8, 8])
  
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 })
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mouseX.set(x)
    mouseY.set(y)
    setGlarePosition({ x: x * 100, y: y * 100 })
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5)
    mouseY.set(0.5)
    setGlarePosition({ x: 50, y: 50 })
  }, [mouseX, mouseY])

  return (
    <motion.div
      ref={cardRef}
      className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        rotateX: springRotateX,
        rotateY: springRotateY,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glare effect overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
        }}
      />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Discount badge */}
        {discount > 0 && (
          <DiscountBadge percentage={discount} className="absolute top-2 left-2" />
        )}
        
        {/* Like button */}
        <motion.button
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md z-20"
          onClick={handleLike}
          whileTap={{ scale: 0.9 }}
          style={{ transform: 'translateZ(20px)' }}
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
          <motion.div 
            className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block z-20"
            style={{ transform: 'translateZ(30px)' }}
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
          </motion.div>
        )}
      </div>

      {/* Content with 3D pop */}
      <motion.div 
        className="p-3 bg-white relative z-10"
        style={{ transform: 'translateZ(10px)' }}
      >
        <h4 className="text-gray-900 font-medium text-sm line-clamp-2 mb-1 min-h-[40px]">
          {product.name}
        </h4>
        
        {/* Rating */}
        <div className="flex items-center gap-1 text-amber-500 text-xs mb-2">
          <Star className="w-3 h-3 fill-current" />
          <span className="font-medium">{product.rating}</span>
          <span className="text-gray-400">({product.reviews})</span>
        </div>
        
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-primary font-bold text-lg">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-gray-400 text-sm line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
        
        {/* Installments */}
        <p className="text-gray-400 text-xs mt-1">
          em até 12x de {formatCurrency(product.price / 12)}
        </p>
        
        {/* PIX discount */}
        <p className="text-primary text-xs font-medium mt-1">
          {formatCurrency(product.price * 0.95)} no PIX
        </p>
      </motion.div>
    </motion.div>
  )
}

