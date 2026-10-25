'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { formatCurrency, calculateDiscount } from '@/lib/utils'
import { DiscountBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCartStore, useUIStore } from '@/store'
import type { Product } from '@/types'
import { ChevronLeft, ChevronRight, ShoppingBag, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductCarouselProps {
  products: Product[]
  onProductClick?: (product: Product) => void
  variant?: 'horizontal' | 'vertical'
}

export function ProductCarousel({ products, onProductClick, variant = 'horizontal' }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCartStore()
  const openProductModal = useUIStore(s => s.openProductModal)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()
    // Size/color has to be chosen in the product modal first
    if (product.variants?.length) openProductModal(product)
    else addItem(product)
  }

  if (variant === 'vertical') {
    return (
      <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
        {products.map((product, index) => {
          const discount = product.originalPrice 
            ? calculateDiscount(product.originalPrice, product.price) 
            : 0

          return (
            <motion.div
              key={product.id}
              className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onProductClick?.(product)}
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
                  <DiscountBadge percentage={discount} className="absolute top-1 left-1 text-[10px] px-1 py-0" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-medium line-clamp-1">{product.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-tropical-green font-bold text-sm">
                    {formatCurrency(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-white/40 text-xs line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleQuickAdd(e, product)}
                className="flex-shrink-0 w-8 h-8 bg-tropical-green/20 hover:bg-tropical-green/30"
              >
                <Plus className="w-4 h-4 text-tropical-green" />
              </Button>
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Products */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-2"
      >
        {products.map((product, index) => {
          const discount = product.originalPrice 
            ? calculateDiscount(product.originalPrice, product.price) 
            : 0

          return (
            <motion.div
              key={product.id}
              className="flex-shrink-0 w-36 glass rounded-xl overflow-hidden cursor-pointer hover:bg-white/20 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onProductClick?.(product)}
              whileTap={{ scale: 0.95 }}
            >
              {/* Image */}
              <div className="relative aspect-square">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {discount > 0 && (
                  <DiscountBadge percentage={discount} className="absolute top-2 left-2" />
                )}
                
                {/* Quick add button */}
                <button
                  onClick={(e) => handleQuickAdd(e, product)}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-tropical-green flex items-center justify-center text-white shadow-lg hover:bg-tropical-green-600 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
              
              {/* Info */}
              <div className="p-2">
                <h4 className="text-white text-xs font-medium line-clamp-1 mb-1">
                  {product.name}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-tropical-green font-bold text-sm">
                    {formatCurrency(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-white/40 text-[10px] line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

