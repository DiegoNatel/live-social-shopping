'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { DiscountBadge } from '@/components/ui/Badge'
import { useUIStore, useCartStore, useUserStore } from '@/store'
import { formatCurrency, calculateDiscount, calculateInstallments } from '@/lib/utils'
import { availableStock, missingVariantTypes, unitPrice, VARIANT_LABELS } from '@/lib/pricing'
import { X, Heart, Share2, Star, Minus, Plus, ShoppingBag, Check, Truck, Shield } from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'

export function ProductModal() {
  const { isProductModalOpen, selectedProduct, closeProductModal, openCheckout } = useUIStore()
  const { addItem } = useCartStore()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const favoriteIds = useUserStore(s => s.favoriteIds)
  const toggleFavorite = useUserStore(s => s.toggleFavorite)
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const [isAdded, setIsAdded] = useState(false)

  if (!selectedProduct) return null

  const product = selectedProduct
  const isLiked = favoriteIds.includes(product.id)
  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.price) 
    : 0
  const price = unitPrice(product, selectedVariants)
  const stock = availableStock(product, selectedVariants)
  const missing = missingVariantTypes(product, selectedVariants)
  const installments = calculateInstallments(price * quantity)
  const pixPrice = price * quantity * 0.95

  const sizeVariants = product.variants?.filter(v => v.type === 'size') || []
  const colorVariants = product.variants?.filter(v => v.type === 'color') || []

  // Picking another variant can lower the stock available
  const selectVariant = (type: 'size' | 'color', name: string) => {
    const next = { ...selectedVariants, [type]: name }
    setSelectedVariants(next)
    setQuantity(q => Math.max(1, Math.min(q, availableStock(product, next))))
  }

  const handleAddToCart = () => {
    addItem(product, quantity, selectedVariants)
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  const handleBuyNow = () => {
    addItem(product, quantity, selectedVariants)
    closeProductModal()
    openCheckout()
  }

  const resetModal = () => {
    setSelectedImage(0)
    setQuantity(1)
    setSelectedVariants({})
    setIsAdded(false)
  }

  return (
    <Dialog.Root open={isProductModalOpen} onOpenChange={(open) => {
      if (!open) {
        closeProductModal()
        resetModal()
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 md:m-auto md:h-fit z-50 w-full md:max-w-2xl md:max-h-[90vh] bg-white md:rounded-2xl overflow-hidden"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center py-2 md:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Close button */}
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>

            <div className="flex flex-col md:flex-row max-h-[85vh] md:max-h-[90vh] overflow-hidden">
              {/* Images */}
              <div className="relative w-full md:w-1/2 bg-gray-100">
                <div className="relative aspect-square">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedImage}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Image
                        src={product.images[selectedImage]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Discount badge */}
                  {discount > 0 && (
                    <DiscountBadge percentage={discount} className="absolute top-4 left-4" />
                  )}
                </div>
                
                {/* Thumbnail strip */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={cn(
                          'relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors',
                          selectedImage === index ? 'border-tropical-green' : 'border-transparent'
                        )}
                      >
                        <Image src={img} alt="" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h2 className="text-deep-ocean font-semibold text-lg md:text-xl leading-tight">
                        {product.name}
                      </h2>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-sunset-gold">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-medium">{product.rating}</span>
                        </div>
                        <span className="text-gray-400 text-sm">({product.reviews} avaliações)</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => (isAuthenticated ? toggleFavorite(product.id) : (window.location.href = '/login'))}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Heart className={cn('w-5 h-5', isLiked ? 'fill-coral-pink text-coral-pink' : 'text-gray-400')} />
                      </button>
                      <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Share2 className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3">
                      <span className="text-gray-900 font-normal text-2xl md:text-3xl">
                        {formatCurrency(price * quantity)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-gray-400 text-lg line-through">
                          {formatCurrency(product.originalPrice * quantity)}
                        </span>
                      )}
                    </div>
                    
                    {/* PIX discount */}
                    <div className="flex items-center gap-2 mt-2 p-2 bg-tropical-green/10 rounded-lg">
                      <PixIcon className="w-5 h-5 text-tropical-green" />
                      <span className="text-tropical-green font-semibold">
                        {formatCurrency(pixPrice)} no PIX
                      </span>
                      <span className="text-tropical-green text-sm">(5% OFF)</span>
                    </div>
                    
                    {/* Installments */}
                    <p className="text-gray-500 text-sm mt-2">
                      ou em até <strong>12x de {formatCurrency(installments[11]?.value || price / 12)}</strong>
                    </p>
                  </div>

                  {/* Seller */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-6">
                    <Avatar src={product.seller.avatar} alt={product.seller.name} size="md" isVerified={product.seller.isVerified} />
                    <div>
                      <p className="text-deep-ocean font-medium">{product.seller.name}</p>
                      <p className="text-gray-500 text-sm">Vendido e entregue por</p>
                    </div>
                  </div>

                  {/* Color variants */}
                  {colorVariants.length > 0 && (
                    <div className="mb-4">
                      <label className="text-deep-ocean font-medium text-sm mb-2 block">
                        Cor: {selectedVariants.color || 'Selecione'}
                      </label>
                      <div className="flex gap-2">
                        {colorVariants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => selectVariant('color', variant.name)}
                            disabled={variant.stock === 0}
                            className={cn(
                              'w-10 h-10 rounded-full border-2 transition-all',
                              selectedVariants.color === variant.name
                                ? 'border-tropical-green scale-110'
                                : variant.stock === 0
                                ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            style={{ backgroundColor: variant.value }}
                            title={`${variant.name}${variant.priceModifier ? ` (+${formatCurrency(variant.priceModifier)})` : ''}${variant.stock === 0 ? ' — esgotado' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size variants */}
                  {sizeVariants.length > 0 && (
                    <div className="mb-4">
                      <label className="text-deep-ocean font-medium text-sm mb-2 block">
                        Tamanho: {selectedVariants.size || 'Selecione'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {sizeVariants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => selectVariant('size', variant.name)}
                            disabled={variant.stock === 0}
                            className={cn(
                              'min-w-[48px] h-10 px-3 rounded-lg font-medium text-sm transition-all',
                              selectedVariants.size === variant.name
                                ? 'bg-tropical-green text-white'
                                : variant.stock === 0
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-gray-100 text-deep-ocean hover:bg-gray-200'
                            )}
                          >
                            {variant.name}
                            {!!variant.priceModifier && (
                              <span className="ml-1 text-xs opacity-75">+{formatCurrency(variant.priceModifier)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="mb-6">
                    <label className="text-deep-ocean font-medium text-sm mb-2 block">Quantidade</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold text-deep-ocean">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                        className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={quantity >= stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-gray-400 text-sm ml-2">{stock} disponíveis</span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Truck className="w-4 h-4 text-tropical-green" />
                      <span>Frete grátis acima de R$ 199</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Shield className="w-4 h-4 text-tropical-green" />
                      <span>Garantia de 30 dias</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-deep-ocean font-medium mb-2">Descrição</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  {(missing.length > 0 || stock === 0) && (
                    <p className="text-gray-500 text-sm mb-2 text-center">
                      {stock === 0
                        ? 'Esgotado'
                        : `Selecione: ${missing.map(t => VARIANT_LABELS[t].toLowerCase()).join(' e ')}`}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleAddToCart}
                      disabled={missing.length > 0 || stock === 0}
                      leftIcon={isAdded ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                      className={cn(
                        'transition-colors',
                        isAdded && 'bg-tropical-green/10 border-tropical-green text-tropical-green'
                      )}
                    >
                      {isAdded ? 'Adicionado!' : 'Adicionar'}
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleBuyNow}
                      disabled={missing.length > 0 || stock === 0}
                    >
                      Comprar Agora
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

