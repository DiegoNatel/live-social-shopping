'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Tag, Truck } from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { cn } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)

  const subtotal = getTotal()
  const shipping = subtotal >= 199 ? 0 : 19.90
  const pixDiscount = Math.round((subtotal - couponDiscount) * 5) / 100 // centavos, like the server
  const total = subtotal + shipping - couponDiscount
  const pixTotal = total - pixDiscount

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'VIVOBUY10') {
      setAppliedCoupon('VIVOBUY10')
      setCouponDiscount(subtotal * 0.1)
      setCouponCode('')
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscount(0)
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
                  {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                    <p className="text-gray-400 text-xs mb-2">
                      {Object.entries(item.selectedVariants).map(([key, value]) => `${key}: ${value}`).join(' • ')}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-primary font-bold">
                      {formatCurrency(item.product.price)}
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
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-gray-900 font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id)}
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
            <Button variant="secondary" onClick={handleApplyCoupon}>
              Aplicar
            </Button>
          </div>
          
          {appliedCoupon && (
            <motion.div
              className="flex items-center justify-between mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-primary text-sm font-medium">
                ✓ Cupom {appliedCoupon} aplicado!
              </span>
              <button
                onClick={handleRemoveCoupon}
                className="text-primary text-sm hover:underline"
              >
                Remover
              </button>
            </motion.div>
          )}
          
          <p className="text-gray-400 text-xs mt-2">
            💡 Use o cupom <strong className="text-primary">VIVOBUY10</strong> e ganhe 10% OFF
          </p>
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

