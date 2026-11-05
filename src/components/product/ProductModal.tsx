'use client'

import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useUIStore } from '@/store'
import { ProductDetails } from './ProductDetails'

// The product window opened from cards and lives; the same content as /product/[id]
export function ProductModal() {
  const { isProductModalOpen, selectedProduct, closeProductModal } = useUIStore()
  if (!selectedProduct) return null

  return (
    <Dialog.Root open={isProductModalOpen} onOpenChange={(open) => !open && closeProductModal()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild aria-describedby={undefined}>
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

            <Dialog.Close asChild>
              <button aria-label="Fechar" className="absolute top-3 right-3 md:top-2 md:right-2 z-10 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>

            <ProductDetails key={selectedProduct.id} product={selectedProduct} inModal Title={Dialog.Title} onLeave={closeProductModal} />
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
