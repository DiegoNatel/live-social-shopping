'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useFreshCart } from '@/hooks/useFreshCart'
import { useCartStore, useUserStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { computeTotals, toCents, fromCents, unitPrice, variantLabel } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CreditCard,
  Check,
  Clock,
  Shield,
  Truck,
  QrCode,
  Smartphone,
} from 'lucide-react'
import { PixIcon } from '@/components/ui/Icons'
import { authClient } from '@/lib/auth-client'
import { PaymentPanel } from '@/components/checkout/PaymentPanel'
import { lookupCep } from '@/lib/cep'
import { ShippingOptions } from '@/components/checkout/ShippingOptions'
import type { ShippingOption } from '@/lib/shipping'
import type { PaymentInfo } from '@/lib/payments'

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
  const [order, setOrder] = useState<{ id: string; total: number; payment?: PaymentInfo | null; paymentError?: string } | null>(null)
  const [paid, setPaid] = useState(false)
  // Online payment (Asaas): needs the buyer's CPF once
  const [paymentSetup, setPaymentSetup] = useState<{ enabled: boolean; savedTaxId: string | null } | null>(null)
  const [taxId, setTaxId] = useState('')
  const [orderError, setOrderError] = useState('')
  const cartChanged = useFreshCart()
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

  // Same rules the order API uses (src/lib/pricing.ts)
  // Freight chosen in the payment step (quoted from the delivery CEP)
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null)
  const totals = computeTotals(toCents(getTotal()), {
    coupon: appliedCoupon,
    pix: paymentMethod === 'pix',
    shippingCents: shippingOption?.cents ?? 0,
  })
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
    fetch('/api/me/payment')
      .then(res => (res.ok ? (res.json() as Promise<{ enabled: boolean; savedTaxId: string | null }>) : null))
      .then(setPaymentSetup)
      .catch(() => {})
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

  // Typing a full CEP fills street, neighborhood, city and state
  const [cepError, setCepError] = useState('')
  const changeCep = async (zipCode: string) => {
    setAddress(a => ({ ...a, zipCode }))
    const found = await lookupCep(zipCode)
    if (!found) return setCepError('')
    if (found === 'NOT_FOUND') return setCepError('CEP não encontrado')
    setCepError('')
    setAddress(a => ({
      ...a,
      street: found.street || a.street,
      neighborhood: found.neighborhood || a.neighborhood,
      city: found.city || a.city,
      state: found.state || a.state,
    }))
  }

  const handleAddressSubmit = () => {
    setStep('payment')
  }

  const handlePaymentSubmit = async () => {
    setIsProcessing(true)
    setOrderError('')

    // Card details are typed on Asaas's page, never here
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: paymentMethod === 'credit' ? 'credit_card' : paymentMethod,
        couponCode: appliedCoupon?.code,
        shippingOption: shippingOption?.id,
        taxId: taxId || undefined,
        // Lets the server refuse the order if prices changed since the page loaded
        expectedTotalCents: totals.total,
        address,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          variants: item.selectedVariants,
        })),
      }),
    })
    const data = (await res.json().catch(() => null)) as
      | { id: string; total: number; payment?: PaymentInfo | null; paymentError?: string; error?: string; message?: string }
      | null
    setIsProcessing(false)

    if (!res.ok) {
      if (data?.error === 'PRICE_CHANGED' || data?.error === 'OUT_OF_STOCK' || data?.error === 'NOT_FOUND') {
        await useCartStore.getState().refreshProducts()
        setOrderError(`${data.message} Sua sacola foi atualizada.`)
      } else if (data?.error === 'TAX_ID') {
        setPaymentSetup(p => (p ? { ...p, savedTaxId: null } : p))
        setOrderError(data.message ?? 'Informe seu CPF')
      } else if (data?.error === 'COUPON') {
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
                  inputMode="numeric"
                  maxLength={9}
                  value={address.zipCode}
                  onChange={(e) => changeCep(e.target.value)}
                  error={cepError || undefined}
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

              <ShippingOptions
                zipCode={address.zipCode}
                items={items.map(item => ({ productId: item.product.id, quantity: item.quantity, variants: item.selectedVariants }))}
                onChange={setShippingOption}
              />

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
                        <span className="text-gray-500 text-sm">À vista</span>
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
                <div className="p-4 rounded-xl bg-white shadow-card mb-6 flex items-center gap-3">
                  <QrCode className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  <p className="text-gray-500 text-sm">
                    O QR Code e o código PIX aparecem depois que você confirmar o pedido.
                  </p>
                </div>
              )}

              {paymentMethod !== 'pix' && (
                <div className="p-4 rounded-xl bg-white shadow-card mb-6 flex items-center gap-3">
                  <Shield className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  <p className="text-gray-500 text-sm">
                    {paymentMethod === 'credit'
                      ? 'Depois de confirmar o pedido, você digita os dados do cartão na página segura do Asaas, nosso parceiro de pagamentos.'
                      : 'O boleto aparece depois que você confirmar o pedido.'}
                  </p>
                </div>
              )}

              {paymentSetup?.enabled && !paymentSetup.savedTaxId && (
                <div className="mb-6">
                  <Input
                    label="CPF de quem paga"
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                  <p className="text-gray-400 text-xs mt-1">Exigido para emitir o pagamento. Pedimos só uma vez.</p>
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
                      <p className="text-gray-500 text-xs">
                        Qtd: {item.quantity}
                        {variantLabel(item.selectedVariants) && ` • ${variantLabel(item.selectedVariants)}`}
                      </p>
                    </div>
                    <span className="text-gray-900 text-sm font-medium">
                      {formatCurrency(unitPrice(item.product, item.selectedVariants) * item.quantity)}
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
                  <span>{shippingOption ? formatCurrency(shipping) : '—'}</span>
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
                  disabled={!shippingOption}
                >
                  {paymentMethod === 'pix' ? 'Confirmar Pagamento PIX' : 'Finalizar Compra'}
                </Button>
              </div>
              {orderError && <p className="text-coral-pink text-sm mt-3 text-center">{orderError}</p>}
              {cartChanged && !orderError && (
                <p className="text-amber-700 text-sm mt-3 text-center">
                  Os preços ou o estoque de algum item mudaram. Confira o total.
                </p>
              )}
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
                {paid ? 'Pagamento confirmado!' : 'Pedido registrado!'}
              </h2>
              <p className="text-gray-500 mb-6">
                {paid ? 'Os vendedores já foram avisados para preparar o envio.' : 'Seu pedido foi registrado e aguarda pagamento.'}
              </p>

              {order && paymentSetup?.enabled && !paid && (
                <div className="rounded-xl bg-white shadow-card p-4 mb-6">
                  <PaymentPanel orderId={order.id} initial={order.payment} onPaid={() => setPaid(true)} />
                </div>
              )}

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

