'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { useFreshCart } from '@/hooks/useFreshCart'
import { useCartStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { availableStock, computeTotals, toCents, fromCents, unitPrice, variantLabel, type AppliedCoupon } from '@/lib/pricing'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Tag, Truck } from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotal, clearCart, appliedCoupon, setCoupon } = useCartStore()
  const [couponCode, setCouponCode] = useState('')
  const cartChanged = useFreshCart()
  const [couponError, setCouponError] = useState('')
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false)

  // Same rules the order API uses (src/lib/pricing.ts)
  const card = computeTotals(toCents(getTotal()), { coupon: appliedCoupon, pix: false })
  const pix = computeTotals(toCents(getTotal()), { coupon: appliedCoupon, pix: true })
  const subtotal = fromCents(card.subtotal)
  const couponDiscount = fromCents(card.coupon)
  const shipping = fromCents(card.shipping)
  const total = fromCents(card.total)
  const pixDiscount = fromCents(pix.pix)
  const pixTotal = fromCents(pix.total)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsCheckingCoupon(true)
    setCouponError('')
    const res = await fetch('/api/coupons/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: couponCode,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, variants: i.selectedVariants })),
      }),
    })
    const data = (await res.json().catch(() => null)) as (AppliedCoupon & { message?: string }) | null
    setIsCheckingCoupon(false)
    if (res.ok && data) {
      setCoupon({ code: data.code, percentOff: data.percentOff, maxDiscountCents: data.maxDiscountCents })
      setCouponCode('')
    } else {
      setCouponError(data?.message ?? 'Cupom inválido')
    }
  }

  const handleRemoveCoupon = () => {
    setCoupon(null)
    setCouponError('')
  }

  if (items.length === 0) {
    return (
      <MainLayout headerProps={{ title: 'Minha Sacola' }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-gray-900 text-xl font-semibold mb-2">Sua sacola está vazia</h2>
          <p className="text-gray-500 mb-6">
            Explore nossas lives e encontre produtos incríveis!
          </p>
          <Link href="/">
            <Button>Explorar Lives</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout headerProps={{ title: 'Minha Sacola', showCart: false }}>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {cartChanged && (
          <p className="mb-3 p-3 rounded-md bg-amber-50 text-amber-700 text-sm">
            Atualizamos preços e estoque da sua sacola. Confira antes de finalizar.
          </p>
        )}
        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                className="flex gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Image */}
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-medium text-sm line-clamp-2 mb-1">
                    {item.product.name}
                  </h3>
                  
                  {/* Variants */}
                  {variantLabel(item.selectedVariants) && (
                    <p className="text-gray-400 text-xs mb-2">{variantLabel(item.selectedVariants)}</p>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-primary font-bold">
                      {formatCurrency(unitPrice(item.product, item.selectedVariants))}
                    </span>
                    {item.product.originalPrice && (
                      <span className="text-gray-400 text-sm line-through">
                        {formatCurrency(item.product.originalPrice)}
                      </span>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-gray-900 font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={item.quantity >= availableStock(item.product, item.selectedVariants)}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Coupon */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código do cupom"
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button variant="secondary" onClick={handleApplyCoupon} isLoading={isCheckingCoupon}>
              Aplicar
            </Button>
          </div>

          {couponError && <p className="text-coral-pink text-sm mt-2">{couponError}</p>}

          {appliedCoupon && (
            <motion.div
              className="flex items-center justify-between mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-primary text-sm font-medium">
                ✓ Cupom {appliedCoupon.code} aplicado ({appliedCoupon.percentOff}% OFF)
              </span>
              <button
                onClick={handleRemoveCoupon}
                className="text-primary text-sm hover:underline"
              >
                Remover
              </button>
            </motion.div>
          )}
          
          {!appliedCoupon && (
            <p className="text-gray-400 text-xs mt-2">
              💡 Use o cupom <strong className="text-primary">VIVOBUY10</strong> e ganhe 10% OFF
            </p>
          )}
        </div>

        {/* Shipping info */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-xl mb-6",
          shipping === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-gray-100'
        )}>
          <Truck className={cn(
            'w-5 h-5',
            shipping === 0 ? 'text-primary' : 'text-gray-500'
          )} />
          <span className={cn(
            'text-sm',
            shipping === 0 ? 'text-primary font-medium' : 'text-gray-600'
          )}>
            {shipping === 0 
              ? '🎉 Frete grátis!' 
              : `Frete grátis a partir de ${formatCurrency(199)} - faltam ${formatCurrency(199 - subtotal)}`
            }
          </span>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-primary">
              <span>Desconto cupom</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-gray-600">
            <span>Frete</span>
            <span className={shipping === 0 ? 'text-primary font-medium' : ''}>
              {shipping === 0 ? 'Grátis' : formatCurrency(shipping)}
            </span>
          </div>
          
          <div className="h-px bg-gray-100" />
          
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-semibold">Total</span>
            <span className="text-gray-900 font-bold text-xl">{formatCurrency(total)}</span>
          </div>
          
          {/* PIX discount highlight */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200">
            <div className="flex items-center gap-2">
              <PixIcon className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-medium">No PIX</span>
            </div>
            <div className="text-right">
              <span className="text-teal-700 font-bold text-lg">{formatCurrency(pixTotal)}</span>
              <span className="text-teal-600/70 text-xs block">
                Economize {formatCurrency(pixDiscount)}
              </span>
            </div>
          </div>
        </div>

        {/* Checkout button */}
        <Button
          fullWidth
          size="lg"
          onClick={() => router.push('/checkout')}
          rightIcon={<ChevronRight className="w-5 h-5" />}
        >
          Finalizar Compra
        </Button>

        {/* Continue shopping */}
        <Link href="/" className="block text-center mt-4">
          <span className="text-primary text-sm hover:underline">
            Continuar comprando
          </span>
        </Link>
      </div>
    </MainLayout>
  )
}

