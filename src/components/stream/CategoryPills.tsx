'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CategoryPillsProps {
  categories: Category[]
  onSelect?: (category: string | null) => void
  selected?: string | null
}

export function CategoryPills({ categories, onSelect, selected }: CategoryPillsProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(selected || null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSelect = (categoryId: string | null) => {
    setActiveCategory(categoryId === activeCategory ? null : categoryId)
    onSelect?.(categoryId === activeCategory ? null : categoryId)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative group">
      {/* Scroll buttons - desktop only */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-gray-600 hidden md:group-hover:flex hover:bg-gray-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-gray-600 hidden md:group-hover:flex hover:bg-gray-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Pills container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 -mx-4"
      >
        {/* All button */}
        <motion.button
          onClick={() => handleSelect(null)}
          className={cn(
            'flex items-center px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
            activeCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
          )}
          whileTap={{ scale: 0.95 }}
        >
          <span>Tudo</span>
        </motion.button>

        {/* Category pills */}
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => handleSelect(category.slug)}
            className={cn(
              'flex items-center px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
              activeCategory === category.slug
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <span>{category.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

