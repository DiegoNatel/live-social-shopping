'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { DiscountBadge } from '@/components/ui/Badge'
import { ReportButton } from '@/components/moderation/ReportButton'
import { useCartStore, useUserStore } from '@/store'
import { formatCurrency, calculateDiscount, installmentOffer, loginHrefHere, formatRating, formatTime, BR_TIME_ZONE } from '@/lib/utils'
import { availableStock, missingVariantTypes, unitPrice, VARIANT_LABELS } from '@/lib/pricing'
import { Heart, Share2, Star, Minus, Plus, ShoppingBag, Check, Truck, Shield, Zap, ChevronRight } from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { cn, creatorPath } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductDetailsProps {
  product: Product
  // In the product window (scrolls inside, links to the full page) or on the product's own page
  inModal?: boolean
  // The heading: the window passes its Dialog.Title, the page an h1
  Title?: React.ElementType
  // Runs when the buyer leaves for another page (checkout, the seller's page), to close the window
  onLeave?: () => void
}

// Photos, price, variants and the buy buttons, shared by the product window and the product page.
// Mount it with key={product.id} so choices reset for each product.
export function ProductDetails({ product, inModal = false, Title = 'h1', onLeave }: ProductDetailsProps) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const [shared, setShared] = useState(false)
  // What "Adicionar" last put in the sacola (variants and quantity), so "Comprar Agora" doesn't add it twice
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const favoriteIds = useUserStore(s => s.favoriteIds)
  const toggleFavorite = useUserStore(s => s.toggleFavorite)
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const [isAdded, setIsAdded] = useState(false)
  const creatorHref = creatorPath(product.seller.username)

  const isLiked = favoriteIds.includes(product.id)
  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.price) 
    : 0
  const price = unitPrice(product, selectedVariants)
  const stock = availableStock(product, selectedVariants)
  const missing = missingVariantTypes(product, selectedVariants)
  const installments = installmentOffer(price * quantity)
  const pixPrice = price * quantity * 0.95

  // When the flash sale ends, e.g. "hoje às 21:00" or "05/11 às 21:00"
  const flashEnds = (() => {
    const end = product.flashSale?.endsAt ? new Date(product.flashSale.endsAt) : null
    if (!end || isNaN(end.getTime())) return null
    const day = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: BR_TIME_ZONE })
    return `${day(end) === day(new Date()) ? 'hoje' : day(end)} às ${formatTime(end)}`
  })()

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
    setLastAdded(JSON.stringify([selectedVariants, quantity]))
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  // Goes to checkout (which sends guests to log in first). Right after "Adicionar" the item is
  // already in the sacola, so it isn't added a second time.
  const handleBuyNow = () => {
    if (lastAdded !== JSON.stringify([selectedVariants, quantity])) addItem(product, quantity, selectedVariants)
    onLeave?.()
    router.push('/checkout')
  }

  // Shares the product's own page
  const handleShare = async () => {
    const url = `${window.location.origin}/product/${encodeURIComponent(product.id)}`
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      // The share sheet was closed
    }
  }

  return (
    <div className={cn('flex flex-col md:flex-row', inModal ? 'max-h-[85vh] md:max-h-[90vh] overflow-hidden' : 'md:gap-8 md:items-start')}>
      {/* Images */}
      <div className={cn('relative w-full md:w-1/2 bg-gray-100', !inModal && 'md:rounded-md md:overflow-hidden md:sticky md:top-20')}>
        <div className="relative aspect-square">
          {/* initial={false}: the first photo shows at once (server-rendered on the product page) */}
          <AnimatePresence mode="wait" initial={false}>
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
      <div className={cn('flex-1 flex flex-col', inModal && 'overflow-hidden')}>
        <div className={cn('flex-1 p-4 md:p-6', inModal ? 'overflow-y-auto' : 'md:px-0')}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <Title className={cn('text-deep-ocean font-semibold leading-tight', inModal ? 'text-lg md:text-xl' : 'text-xl md:text-2xl')}>
                {product.name}
              </Title>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-sunset-gold">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{formatRating(product.rating, product.reviews) ?? '–'}</span>
                </div>
                <span className="text-gray-400 text-sm">
                  {product.reviews ? `(${product.reviews} ${product.reviews === 1 ? 'avaliação' : 'avaliações'})` : 'Sem avaliações'}
                </span>
              </div>
            </div>
            
            <div className={cn('flex gap-2', inModal && 'md:mr-8')}>
              <button
                aria-label={isLiked ? 'Remover dos favoritos' : 'Favoritar'}
                onClick={() => (isAuthenticated ? toggleFavorite(product.id) : (window.location.href = loginHrefHere()))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <Heart className={cn('w-5 h-5', isLiked ? 'fill-coral-pink text-coral-pink' : 'text-gray-400')} />
              </button>
              <button
                aria-label={shared ? 'Link copiado' : 'Compartilhar'}
                title={shared ? 'Link copiado' : 'Compartilhar'}
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                {shared ? <Check className="w-5 h-5 text-tropical-green" /> : <Share2 className="w-5 h-5 text-gray-400" />}
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
            
            {product.flashSale && (
              <p className="flex items-center gap-1 mt-1 text-coral-pink text-sm font-medium">
                <Zap className="w-4 h-4 fill-current" />
                {/* No separate percentage: the card's "% OFF" already compares with the struck-through price */}
                Oferta relâmpago · restam {product.flashSale.remaining}
                {flashEnds && ` · termina ${flashEnds}`}
              </p>
            )}

            {/* PIX discount */}
            <div className="flex items-center gap-2 mt-2 p-2 bg-tropical-green/10 rounded-lg">
              <PixIcon className="w-5 h-5 text-tropical-green" />
              <span className="text-tropical-green font-semibold">
                {formatCurrency(pixPrice)} no PIX
              </span>
              <span className="text-tropical-green text-sm">(5% OFF)</span>
            </div>
            
            {/* Installments */}
            {installments && (
              <p className="text-gray-500 text-sm mt-2">
                ou em até <strong>{installments}</strong>
              </p>
            )}
          </div>

          {/* Seller */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-6">
            {/* The seller's page: their other products and lives */}
            <Link href={creatorHref} onClick={onLeave} className="flex items-center gap-3 flex-1 min-w-0 group">
              <Avatar src={product.seller.avatar} alt={product.seller.name} size="md" isVerified={product.seller.isVerified} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-sm">Vendido e entregue por</p>
                <p className="text-deep-ocean font-medium truncate group-hover:underline">{product.seller.name}</p>
              </div>
            </Link>
            <ReportButton
              type="product"
              id={product.id}
              label="Denunciar"
              iconClassName="w-4 h-4"
              className="flex items-center gap-1 text-gray-400 text-xs hover:text-coral-pink"
            />
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
                    aria-label={variant.name}
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
                aria-label="Diminuir quantidade"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-semibold text-deep-ocean">{quantity}</span>
              <button
                aria-label="Aumentar quantidade"
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
              <span>Frete calculado pelo seu CEP no checkout</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Shield className="w-4 h-4 text-tropical-green" />
              <span>Garantia de 30 dias</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-deep-ocean font-medium mb-2">Descrição</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
  
          {inModal && (
            <Link
              href={`/product/${encodeURIComponent(product.id)}`}
              onClick={onLeave}
              className="inline-flex items-center gap-1 mt-6 text-sky-blue text-sm font-medium hover:underline"
            >
              Ver página do produto
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className={cn('p-4 border-t border-gray-100 bg-white', !inModal && 'sticky bottom-0 md:static md:border-0 md:px-0')}>
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
  )
}
