'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryPillsProps {
  categories: Category[]
  onSelect?: (category: string | null) => void
  selected?: string | null
}

// Category filter: "Tudo" plus one pill per category. Tapping the selected one clears it.
// The row scrolls sideways when it doesn't fit.
export function CategoryPills({ categories, onSelect, selected = null }: CategoryPillsProps) {
  const activeCategory = selected
  const handleSelect = (slug: string | null) => onSelect?.(slug === activeCategory ? null : slug)

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 -mx-4">
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

