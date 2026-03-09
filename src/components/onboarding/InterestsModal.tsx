'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Check, Search, ChevronRight } from 'lucide-react'

// Featured categories with icons (top horizontal scroll)
const featuredCategories = [
  { id: 'fashion', name: 'Moda', icon: '👗', color: '#9146FF' },
  { id: 'beauty', name: 'Beleza', icon: '💄', color: '#9146FF' },
  { id: 'electronics', name: 'Tech', icon: '📱', color: '#9146FF' },
  { id: 'home', name: 'Casa', icon: '🏠', color: '#9146FF' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: '#9146FF' },
  { id: 'food', name: 'Food', icon: '🍕', color: '#9146FF' },
]

// Interest categories for live shopping
const interestCategories = [
  {
    id: 'fashion',
    name: 'Moda & Estilo',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    viewers: '124K',
    tags: ['Roupas', 'Acessórios'],
  },
  {
    id: 'beauty',
    name: 'Beleza & Skincare',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
    viewers: '89K',
    tags: ['Maquiagem', 'Cuidados'],
  },
  {
    id: 'electronics',
    name: 'Eletrônicos',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    viewers: '156K',
    tags: ['Gadgets', 'Celulares'],
  },
  {
    id: 'sports',
    name: 'Esportes',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
    viewers: '67K',
    tags: ['Fitness', 'Outdoor'],
  },
  {
    id: 'home',
    name: 'Casa & Decoração',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    viewers: '45K',
    tags: ['Móveis', 'Organização'],
  },
  {
    id: 'kids',
    name: 'Infantil',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400',
    viewers: '38K',
    tags: ['Brinquedos', 'Roupas'],
  },
  {
    id: 'food',
    name: 'Alimentos & Gourmet',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    viewers: '92K',
    tags: ['Delivery', 'Receitas'],
  },
  {
    id: 'fitness',
    name: 'Fitness & Bem-estar',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    viewers: '73K',
    tags: ['Suplementos', 'Equipamentos'],
  },
  {
    id: 'jewelry',
    name: 'Joias & Acessórios',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    viewers: '51K',
    tags: ['Luxo', 'Bijuterias'],
  },
  {
    id: 'books',
    name: 'Livros & Papelaria',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    viewers: '29K',
    tags: ['Leitura', 'Escritório'],
  },
  {
    id: 'pets',
    name: 'Pets',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    viewers: '84K',
    tags: ['Cães', 'Gatos'],
  },
  {
    id: 'games',
    name: 'Games & Geek',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400',
    viewers: '198K',
    tags: ['Consoles', 'PC'],
  },
]

// Suggested channels to follow
const suggestedChannels = [
  {
    id: 'user-1',
    name: 'Ana Carolina',
    username: 'anacarol_style',
    avatar: 'https://i.pravatar.cc/150?img=1',
    category: 'Moda',
    isLive: true,
    viewers: '2.3K',
  },
  {
    id: 'user-2',
    name: 'Lucas Tech',
    username: 'lucastech',
    avatar: 'https://i.pravatar.cc/150?img=3',
    category: 'Eletrônicos',
    isLive: true,
    viewers: '5.1K',
  },
  {
    id: 'user-3',
    name: 'Bia Fitness',
    username: 'biafitness',
    avatar: 'https://i.pravatar.cc/150?img=5',
    category: 'Fitness',
    isLive: true,
    viewers: '1.8K',
  },
  {
    id: 'user-4',
    name: 'Loja Bella',
    username: 'lojabella',
    avatar: 'https://i.pravatar.cc/150?img=9',
    category: 'Moda',
    isLive: false,
    viewers: '0',
  },
  {
    id: 'user-5',
    name: 'Casa Perfeita',
    username: 'casaperfeita',
    avatar: 'https://i.pravatar.cc/150?img=12',
    category: 'Casa',
    isLive: true,
    viewers: '892',
  },
  {
    id: 'user-6',
    name: 'Makeup Queen',
    username: 'makeupqueen',
    avatar: 'https://i.pravatar.cc/150?img=16',
    category: 'Beleza',
    isLive: true,
    viewers: '3.4K',
  },
]

interface InterestsModalProps {
  open: boolean
  onComplete: (interests: string[], channels: string[]) => void
}

export function InterestsModal({ open, onComplete }: InterestsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())

  const filteredCategories = interestCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const totalSelected = selectedInterests.size + selectedChannels.size
  const canContinue = totalSelected >= 1

  const handleComplete = () => {
    onComplete(Array.from(selectedInterests), Array.from(selectedChannels))
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        {/* Overlay with progressive blur depth effect */}
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Multiple blur layers for depth */}
            <motion.div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div 
              className="absolute inset-0 bg-black/20 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            />
            <motion.div 
              className="absolute inset-0 bg-black/10 backdrop-blur-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            />
          </motion.div>
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-0 z-50 m-auto w-[95vw] max-w-[1000px] h-fit max-h-[90vh] bg-white rounded-xl overflow-hidden flex flex-col"
            style={{
              boxShadow: '0 25px 100px -12px rgba(0, 0, 0, 0.5), 0 50px 100px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95, rotateX: -5 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 40, scale: 0.95, rotateX: 5 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <Dialog.Title className="text-2xl font-bold text-gray-900 tracking-tight">
                O que te interessa?
              </Dialog.Title>
              <Dialog.Description className="text-gray-500 mt-1 text-sm">
                Escolha categorias para personalizar seu feed
              </Dialog.Description>
            </div>

            {/* Featured Categories - Horizontal Scroll */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {featuredCategories.map((category) => {
                  const isSelected = selectedInterests.has(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleInterest(category.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all',
                        isSelected
                          ? 'bg-[#9146FF] text-white'
                          : 'bg-[#9146FF] text-white hover:bg-[#772ce8]'
                      )}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                      {isSelected && <Check className="w-4 h-4 ml-1" />}
                    </button>
                  )
                })}
                <button className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-[#9146FF] hover:bg-gray-100 rounded-lg whitespace-nowrap transition-colors">
                  Ver tudo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categorias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-100 border-none text-gray-900 placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#9146FF]"
                />
              </div>
            </div>

            {/* Section Title */}
            <div className="px-6 pb-3">
              <h3 className="text-sm font-bold text-[#9146FF]">
                Categorias{' '}
                <span className="text-gray-900">que combinam com você</span>
              </h3>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {/* Categories Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredCategories.map((category, index) => {
                  const isSelected = selectedInterests.has(category.id)
                  
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => toggleInterest(category.id)}
                      className="group text-left"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      {/* Image Card */}
                      <div className={cn(
                        'relative aspect-[4/5] rounded-lg overflow-hidden mb-2 transition-all',
                        isSelected && 'ring-2 ring-[#9146FF] ring-offset-2'
                      )}>
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Selected Overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#9146FF]/20 flex items-center justify-center">
                            <div className="w-8 h-8 bg-[#9146FF] rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {category.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {category.viewers} espectadores
                          </p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {category.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Live Channels Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    AO VIVO
                  </span>
                  <span className="text-gray-900 font-bold text-sm">Canais recomendados</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {suggestedChannels.map((channel, index) => {
                    const isSelected = selectedChannels.has(channel.id)
                    
                    return (
                      <motion.button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className="flex flex-col items-center text-center group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.03 }}
                      >
                        <div className={cn(
                          'relative p-0.5 rounded-full transition-all',
                          isSelected 
                            ? 'bg-[#9146FF]' 
                            : channel.isLive 
                              ? 'bg-gradient-to-br from-red-500 to-orange-500'
                              : 'bg-gray-200'
                        )}>
                          <div className="relative">
                            <Avatar
                              src={channel.avatar}
                              alt={channel.name}
                              size="lg"
                              className="ring-2 ring-white"
                            />
                            {isSelected && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#9146FF] rounded-full flex items-center justify-center ring-2 ring-white">
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className={cn(
                          'text-sm font-semibold mt-2 transition-colors truncate w-full',
                          isSelected ? 'text-[#9146FF]' : 'text-gray-900'
                        )}>
                          {channel.name}
                        </p>
                        <p className="text-xs text-gray-500">{channel.category}</p>
                        {channel.isLive && (
                          <p className="text-xs text-red-500 font-medium">{channel.viewers} assistindo</p>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                {totalSelected > 0 && (
                  <motion.p
                    className="text-sm font-medium text-[#9146FF]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {totalSelected} selecionado{totalSelected > 1 ? 's' : ''}
                  </motion.p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onComplete([], [])}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!canContinue}
                  className={cn(
                    'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
                    canContinue
                      ? 'bg-[#9146FF] text-white hover:bg-[#772ce8]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {canContinue ? 'Continuar' : 'Escolha 1 ou mais'}
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
