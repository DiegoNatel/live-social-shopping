'use client'

import { ProductCard } from './ProductCard'
import { ProductModal } from './ProductModal'
import type { Product } from '@/types'

// Product cards plus the modal they open
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
      <ProductModal />
    </>
  )
}
