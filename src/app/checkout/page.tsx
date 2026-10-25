'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useCartStore, useUserStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { computeTotals, toCents, fromCents } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CreditCard,
  Check,
  Copy,
  Clock,
  Shield,
  Truck,
  QrCode,
  Smartphone,
} from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { authClient } from '@/lib/auth-client'

type Step = 'address' | 'payment' | 'confirmation'
type PaymentMethod = 'pix' | 'credit' | 'boleto'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotal, clearCart, appliedCoupon, setCoupon } = useCartStore()
  const { user } = useUserStore()
  
  const [step, setStep] = useState<Step>('address')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null)
  const [orderError, setOrderError] = useState('')
  const { data: session, isPending: sessionPending } = authClient.useSession()

  // Address form state
  const [address, setAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })

  // Card form state
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: '1',
  })

  // Same rules the order API uses (src/lib/pricing.ts)
  const totals = computeTotals(toCents(getTotal()), { coupon: appliedCoupon, pix: paymentMethod === 'pix' })
  const subtotal = fromCents(totals.subtotal)
  const couponDiscount = fromCents(totals.coupon)
  const shipping = fromCents(totals.shipping)
  const pixDiscount = fromCents(totals.pix)
  const total = fromCents(totals.total)

  // Checkout needs an account; prefill the last address used
  useEffect(() => {
    if (sessionPending) return
    if (!session) {
      router.push('/login')
      return
    }
    fetch('/api/me/address')
      .then(res => (res.ok ? (res.json() as Promise<Record<string, string> | null>) : null))
      .then(saved => {
        if (!saved) return
        setAddress(a => ({
          zipCode: a.zipCode || saved.zipCode,
          street: a.street || saved.street,
          number: a.number || saved.number,
          complement: a.complement || saved.complement || '',
          neighborhood: a.neighborhood || saved.neighborhood,
          city: a.city || saved.city,
          state: a.state || saved.state,
        }))
      })
  }, [session, sessionPending, router])

  const handleAddressSubmit = () => {
    setStep('payment')
  }

  const handlePaymentSubmit = async () => {
    setIsProcessing(true)
    setOrderError('')

    // Card details never leave the browser: real payment comes with the payment provider
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: paymentMethod === 'credit' ? 'credit_card' : paymentMethod,
        couponCode: appliedCoupon?.code,
        address,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          variants: item.selectedVariants,
        })),
      }),
    })
    const data = (await res.json().catch(() => null)) as
      | { id: string; total: number; error?: string; message?: string }
      | null
    setIsProcessing(false)

    if (!res.ok) {
      if (data?.error === 'COUPON') {
        // Drop the coupon so the totals update and the order can be placed without it
        setCoupon(null)
        setOrderError(`${data.message}. O cupom foi removido; confira o novo total.`)
      } else {
        setOrderError(data?.message ?? 'Não foi possível finalizar o pedido. Tente novamente.')
      }
      return
    }

    setOrder(data)
    setStep('confirmation')
    setOrderComplete(true)
    clearCart()
  }

  const copyPixCode = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136vivobuy@pix.com5204000053039865802BR')
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 3000)
  }

  const isEmpty = items.length === 0 && !orderComplete

  useEffect(() => {
    // The first client render uses the server snapshot (empty cart) before the saved
    // cart is applied, so check the store itself rather than this render's value
    if (isEmpty && useCartStore.getState().items.length === 0) router.push('/cart')
  }, [isEmpty, router])

  if (isEmpty) return null

  return (
    <MainLayout
      showNav={false}
      headerProps={{
        title: 'Checkout',
        showBack: true,
        showSearch: false,
        showCart: false,
        showNotifications: false,
        showAvatar: false,
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['address', 'payment', 'confirmation'] as Step[]).map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s || (index < ['address', 'payment', 'confirmation'].indexOf(step))
                    ? 'bg-tropical-green text-white'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {index < ['address', 'payment', 'confirmation'].indexOf(step) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 2 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    index < ['address', 'payment', 'confirmation'].indexOf(step)
                      ? 'bg-tropical-green'
                      : 'bg-gray-100'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Address Step */}
          {step === 'address' && (
            <motion.div
              key="address"
              className="bg-white rounded-md shadow-card p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-gray-900 font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                Endereço de Entrega
              </h2>

              <div className="space-y-4">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Rua"
                      placeholder="Nome da rua"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Número"
                    placeholder="123"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                  />
                </div>
                
                <Input
                  label="Complemento"
                  placeholder="Apto, bloco, etc."
                  value={address.complement}
                  onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                />
                
                <Input
                  label="Bairro"
                  placeholder="Bairro"
                  value={address.neighborhood}
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Cidade"
                      placeholder="Cidade"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Estado"
                    placeholder="SP"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button fullWidth size="lg" onClick={handleAddressSubmit}>
                  Continuar para Pagamento
                </Button>
              </div>
            </motion.div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-gray-900 font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-400" />
                Forma de Pagamento
              </h2>

              {/* Payment Methods */}
              <div className="space-y-3 mb-6">
                {/* PIX */}
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    paymentMethod === 'pix'
                      ? 'border-tropical-green bg-tropical-green/10'
                      : 'border-gray-300 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#32BCAD] flex items-center justify-center">
                        <PixIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium block">PIX</span>
                        <span className="text-tropical-green text-sm">5% de desconto</span>
                      </div>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      paymentMethod === 'pix' ? 'border-tropical-green bg-tropical-green' : 'border-gray-300'
                    )}>
                      {paymentMethod === 'pix' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>

                {/* Credit Card */}
                <button
                  onClick={() => setPaymentMethod('credit')}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    paymentMethod === 'credit'
                      ? 'border-tropical-green bg-tropical-green/10'
                      : 'border-gray-300 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-glow flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium block">Cartão de Crédito</span>
                        <span className="text-gray-500 text-sm">Em até 12x sem juros</span>
                      </div>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      paymentMethod === 'credit' ? 'border-tropical-green bg-tropical-green' : 'border-gray-300'
                    )}>
                      {paymentMethod === 'credit' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>

                {/* Boleto */}
                <button
                  onClick={() => setPaymentMethod('boleto')}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    paymentMethod === 'boleto'
                      ? 'border-tropical-green bg-tropical-green/10'
                      : 'border-gray-300 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sunset-gold flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-deep-ocean" />
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium block">Boleto Bancário</span>
                        <span className="text-gray-500 text-sm">Vencimento em 3 dias</span>
                      </div>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      paymentMethod === 'boleto' ? 'border-tropical-green bg-tropical-green' : 'border-gray-300'
                    )}>
                      {paymentMethod === 'boleto' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              </div>

              {/* Payment Details */}
              {paymentMethod === 'pix' && (
                <div className="p-4 rounded-xl bg-white shadow-card mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-deep-ocean" />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm text-center mb-3">
                    Escaneie o QR Code ou copie o código PIX
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={copyPixCode}
                    leftIcon={pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  >
                    {pixCopied ? 'Código copiado!' : 'Copiar código PIX'}
                  </Button>
                </div>
              )}

              {paymentMethod === 'credit' && (
                <div className="space-y-4 mb-6">
                  <Input
                    label="Número do cartão"
                    placeholder="0000 0000 0000 0000"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                  />
                  <Input
                    label="Nome no cartão"
                    placeholder="NOME COMPLETO"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Validade"
                      placeholder="MM/AA"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                    />
                    <Input
                      label="CVV"
                      placeholder="123"
                      type="password"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Parcelas
                    </label>
                    <select
                      value={cardData.installments}
                      onChange={(e) => setCardData({ ...cardData, installments: e.target.value })}
                      className="w-full h-12 px-4 rounded-lg bg-white border border-gray-300 text-gray-900 outline-none focus:border-sky-blue transition-colors"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatCurrency(total / n)} {n <= 3 ? 'sem juros' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-xl bg-white shadow-card p-4 space-y-3 mb-6">
                <h3 className="text-gray-900 font-medium mb-2">Resumo do Pedido</h3>
                
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                      <p className="text-gray-500 text-xs">Qtd: {item.quantity}</p>
                    </div>
                    <span className="text-gray-900 text-sm font-medium">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
                
                <div className="h-px bg-gray-100 my-3" />
                
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {couponDiscount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-tropical-green text-sm">
                    <span>Cupom {appliedCoupon.code}</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Frete</span>
                  <span>{shipping === 0 ? 'Grátis' : formatCurrency(shipping)}</span>
                </div>
                {pixDiscount > 0 && (
                  <div className="flex justify-between text-tropical-green text-sm">
                    <span>Desconto PIX</span>
                    <span>-{formatCurrency(pixDiscount)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-gray-900 font-semibold">
                  <span>Total</span>
                  <span className="text-tropical-green text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Compra segura</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Truck className="w-4 h-4" />
                  <span>Entrega garantida</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep('address')}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Voltar
                </Button>
                <Button
                  fullWidth
                  size="lg"
                  onClick={handlePaymentSubmit}
                  isLoading={isProcessing}
                >
                  {paymentMethod === 'pix' ? 'Confirmar Pagamento PIX' : 'Finalizar Compra'}
                </Button>
              </div>
              {orderError && <p className="text-coral-pink text-sm mt-3 text-center">{orderError}</p>}
            </motion.div>
          )}

          {/* Confirmation Step */}
          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-md shadow-card text-center px-6 py-8"
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-tropical-green mx-auto mb-6 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-gray-900 text-2xl font-bold mb-2">
                Pedido registrado!
              </h2>
              <p className="text-gray-500 mb-6">
                Seu pedido foi registrado e aguarda pagamento.
              </p>

              <div className="rounded-xl bg-white shadow-card p-4 mb-6 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">Número do pedido</span>
                  <span className="text-gray-900 font-mono">{order?.id}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">Previsão de entrega</span>
                  <span className="text-gray-900">3-5 dias úteis</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Valor total</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(order?.total ?? 0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button fullWidth onClick={() => router.push('/')}>
                  Continuar Comprando
                </Button>
                <Button variant="ghost" fullWidth onClick={() => router.push('/orders')}>
                  Ver Meus Pedidos
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}

