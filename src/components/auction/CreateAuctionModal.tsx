'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Gavel, Clock, DollarSign, TrendingUp, ChevronDown, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

interface CreateAuctionModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onCreateAuction: (data: AuctionFormData) => void
}

export interface AuctionFormData {
  productId: string
  startingPrice: number
  minimumIncrement: number
  duration: number // in minutes
  startTime: 'now' | Date
}

export function CreateAuctionModal({ isOpen, onClose, products, onCreateAuction }: CreateAuctionModalProps) {
  const [step, setStep] = useState<'product' | 'config'>('product')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [minimumIncrement, setMinimumIncrement] = useState('10')
  const [duration, setDuration] = useState('30')
  const [startOption, setStartOption] = useState<'now' | 'scheduled'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )
  
  const durationOptions = [
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '120', label: '2 horas' },
    { value: '1440', label: '24 horas' },
  ]
  
  const incrementOptions = [
    { value: '5', label: 'R$ 5,00' },
    { value: '10', label: 'R$ 10,00' },
    { value: '20', label: 'R$ 20,00' },
    { value: '50', label: 'R$ 50,00' },
    { value: '100', label: 'R$ 100,00' },
  ]
  
  const handleSubmit = () => {
    if (!selectedProduct || !startingPrice) return
    
    let startTime: 'now' | Date = 'now'
    if (startOption === 'scheduled' && scheduledDate && scheduledTime) {
      startTime = new Date(`${scheduledDate}T${scheduledTime}`)
    }
    
    onCreateAuction({
      productId: selectedProduct.id,
      startingPrice: parseFloat(startingPrice),
      minimumIncrement: parseFloat(minimumIncrement),
      duration: parseInt(duration),
      startTime,
    })
    
    // Reset form
    setStep('product')
    setSelectedProduct(null)
    setStartingPrice('')
    setMinimumIncrement('10')
    setDuration('30')
    setStartOption('now')
    onClose()
  }
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    // Suggest starting price as 50% of product price
    setStartingPrice(Math.floor(product.price * 0.5).toString())
    setStep('config')
  }
  
  const isFormValid = selectedProduct && startingPrice && parseFloat(startingPrice) > 0

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        
        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Criar Leilão</h2>
                <p className="text-sm text-gray-500">
                  {step === 'product' ? 'Selecione um produto' : 'Configure o leilão'}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Progress Steps */}
            <div className="flex gap-2 mt-4">
              <div className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                step === 'product' || step === 'config' ? 'bg-orange-500' : 'bg-gray-200'
              )} />
              <div className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                step === 'config' ? 'bg-orange-500' : 'bg-gray-200'
              )} />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {step === 'product' ? (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>
                
                {/* Product List */}
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <motion.button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        selectedProduct?.id === product.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                        <p className="text-sm text-gray-500">{formatCurrency(product.price)}</p>
                        <p className="text-xs text-gray-400">{product.stock} em estoque</p>
                      </div>
                      {selectedProduct?.id === product.id && (
                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Product Preview */}
                {selectedProduct && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                      <Image
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{selectedProduct.name}</h4>
                      <p className="text-xs text-gray-500">Preço de venda: {formatCurrency(selectedProduct.price)}</p>
                    </div>
                    <button
                      onClick={() => setStep('product')}
                      className="text-sm text-orange-500 hover:underline"
                    >
                      Alterar
                    </button>
                  </div>
                )}
                
                {/* Starting Price */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 text-orange-500" />
                    Lance Inicial
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-lg font-semibold"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Sugestão: {formatCurrency((selectedProduct?.price || 0) * 0.5)} (50% do preço)
                  </p>
                </div>
                
                {/* Minimum Increment */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Incremento Mínimo
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {incrementOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMinimumIncrement(option.value)}
                        className={cn(
                          'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                          minimumIncrement === option.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Duration */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Duração do Leilão
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {durationOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDuration(option.value)}
                        className={cn(
                          'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                          duration === option.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Start Time */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Quando Iniciar
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setStartOption('now')}
                      className={cn(
                        'py-3 px-4 rounded-xl text-sm font-medium transition-all border-2',
                        startOption === 'now'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      )}
                    >
                      Começar Agora
                    </button>
                    <button
                      onClick={() => setStartOption('scheduled')}
                      className={cn(
                        'py-3 px-4 rounded-xl text-sm font-medium transition-all border-2',
                        startOption === 'scheduled'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      )}
                    >
                      Agendar
                    </button>
                  </div>
                  
                  {startOption === 'scheduled' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              {step === 'config' && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep('product')}
                >
                  Voltar
                </Button>
              )}
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                onClick={step === 'product' ? () => selectedProduct && setStep('config') : handleSubmit}
                disabled={step === 'product' ? !selectedProduct : !isFormValid}
              >
                {step === 'product' ? 'Próximo' : 'Criar Leilão'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

