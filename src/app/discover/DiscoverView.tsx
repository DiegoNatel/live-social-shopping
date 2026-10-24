'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { MainLayout } from '@/components/layout/MainLayout'
import { SearchInput } from '@/components/ui/Input'
import { StreamCard } from '@/components/stream/StreamCard'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductModal } from '@/components/product/ProductModal'
import { Avatar } from '@/components/ui/Avatar'
import { FeaturedCreators } from '@/components/stream/FeaturedCreators'
import type { Stream, Product } from '@/types'
import { Clock, Radio, ShoppingBag, Sparkles, Users, X, Star, UserCircle } from 'lucide-react'
import { cn, formatViewerCount } from '@/lib/utils'
import type { User } from '@/types'

// Filter type kept for potential future use
type ContentFilter = 'all' | 'live' | 'creators' | 'upcoming' | 'products'

interface CreatorWithMeta extends User {
  isLive: boolean
  streamCount: number
  totalViewers: number
}

export function DiscoverView({ streams, products }: { streams: Stream[]; products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all')

  // Get unique creators from streams with metadata
  const creators: CreatorWithMeta[] = useMemo(() => {
    const uniqueCreators = new Map<string, CreatorWithMeta>()
    
    streams.forEach(stream => {
      const existing = uniqueCreators.get(stream.host.id)
      if (existing) {
        existing.streamCount += 1
        existing.totalViewers += stream.viewerCount
        existing.isLive = existing.isLive || stream.isLive
      } else {
        uniqueCreators.set(stream.host.id, {
          ...stream.host,
          isLive: stream.isLive,
          streamCount: 1,
          totalViewers: stream.viewerCount,
        })
      }
    })
    
    // Sort by live status first, then by total viewers
    return Array.from(uniqueCreators.values()).sort((a, b) => {
      if (a.isLive && !b.isLive) return -1
      if (!a.isLive && b.isLive) return 1
      return b.totalViewers - a.totalViewers
    })
  }, [streams])

  const liveStreams = streams.filter(s => s.isLive)
  const upcomingStreams = streams.filter(s => !s.isLive)

  // Filter streams by creator
  const filterByCreator = <T extends { host?: { id: string }; seller?: { id: string } }>(items: T[]): T[] => {
    if (!selectedCreator) return items
    return items.filter(item => {
      const hostId = (item as { host?: { id: string } }).host?.id
      const sellerId = (item as { seller?: { id: string } }).seller?.id
      return hostId === selectedCreator || sellerId === selectedCreator
    })
  }

  const filteredLiveStreams = filterByCreator(liveStreams).filter(stream => {
    if (selectedCategory && stream.category !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        stream.title.toLowerCase().includes(query) ||
        stream.host.name.toLowerCase().includes(query) ||
        stream.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const filteredUpcomingStreams = filterByCreator(upcomingStreams).filter(stream => {
    if (selectedCategory && stream.category !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        stream.title.toLowerCase().includes(query) ||
        stream.host.name.toLowerCase().includes(query) ||
        stream.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const filteredProducts = filterByCreator(products).filter(product => {
    if (selectedCategory && product.category !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const filterButtons: { id: ContentFilter; label: string; icon: React.ElementType; isLive?: boolean; count?: number; isCreators?: boolean }[] = [
    { id: 'all', label: 'Tudo', icon: Sparkles },
    { id: 'live', label: 'Ao Vivo', icon: Radio, isLive: true, count: filteredLiveStreams.length },
    { id: 'creators', label: 'Criadores', icon: UserCircle, isCreators: true, count: creators.length },
    { id: 'upcoming', label: 'Em Breve', icon: Clock, count: filteredUpcomingStreams.length },
    { id: 'products', label: 'Produtos', icon: ShoppingBag, count: filteredProducts.length },
  ]

  const handleCreatorSelect = (creatorId: string) => {
    setSelectedCreator(prev => prev === creatorId ? null : creatorId)
  }

  const clearCreatorFilter = () => {
    setSelectedCreator(null)
  }

  // Get selected creator data
  const selectedCreatorData = selectedCreator ? creators.find(c => c.id === selectedCreator) : null

  // Category data with images and colors
  const categoryCards = [
    { id: 'fashion', name: 'Moda', icon: '👗', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', color: 'from-pink-500 to-rose-500', viewers: '12.4K' },
    { id: 'beauty', name: 'Beleza', icon: '💄', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300', color: 'from-purple-500 to-pink-500', viewers: '8.2K' },
    { id: 'electronics', name: 'Tech', icon: '📱', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300', color: 'from-blue-500 to-cyan-500', viewers: '15.8K' },
    { id: 'sports', name: 'Esportes', icon: '⚽', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300', color: 'from-green-500 to-emerald-500', viewers: '6.1K' },
    { id: 'home', name: 'Casa', icon: '🏠', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300', color: 'from-amber-500 to-orange-500', viewers: '4.3K' },
    { id: 'food', name: 'Food', icon: '🍕', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300', color: 'from-red-500 to-orange-500', viewers: '3.7K' },
  ]

  return (
    <MainLayout headerProps={{ showSearch: false }}>
      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="px-4 py-4">
          <SearchInput
            placeholder="Buscar criadores, lives ou produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Creator Filter Bar - Horizontal Scrollable (hide when in Creators tab) */}
        {activeFilter !== 'creators' && (
          <section className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-1.5">
                <Star className="w-4 h-4 text-primary" />
                Criadores
              </h2>
              {selectedCreator && (
                <button
                  onClick={clearCreatorFilter}
                  className="flex items-center gap-1.5 text-sm text-coral-pink hover:text-coral-pink/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpar filtro
                </button>
              )}
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {creators.map((creator, index) => {
                const isSelected = selectedCreator === creator.id
                return (
                  <motion.button
                    key={creator.id}
                    onClick={() => handleCreatorSelect(creator.id)}
                    className="flex flex-col items-center gap-1 min-w-[60px] group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Creator Avatar - Compact clean design */}
                    <div className="relative">
                      <Avatar
                        src={creator.avatar}
                        alt={creator.name}
                        size="md"
                        className={cn(
                          'transition-all',
                          creator.isLive && 'ring-2 ring-coral-pink',
                          isSelected && !creator.isLive && 'ring-2 ring-primary'
                        )}
                      />
                      {creator.isLive && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-coral-pink text-white text-[8px] font-bold rounded uppercase">
                          LIVE
                        </span>
                      )}
                    </div>
                    
                    {/* Creator Name */}
                    <span className={cn(
                      'text-[10px] font-medium truncate max-w-[60px] text-center transition-colors',
                      isSelected ? 'text-primary' : 'text-gray-600 group-hover:text-gray-900'
                    )}>
                      {creator.name.split(' ')[0]}
                    </span>
                    
                    {/* Follower count */}
                    <span className="text-[9px] text-gray-400 -mt-0.5">
                      {formatViewerCount(creator.followers)}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </section>
        )}

        {/* Selected Creator Banner - Clean & Simple */}
        <AnimatePresence>
          {selectedCreatorData && (
            <motion.section
              className="px-4 mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                {/* Avatar - Clean, no glow */}
                <div className="relative flex-shrink-0">
                  <Avatar 
                    src={selectedCreatorData.avatar} 
                    alt={selectedCreatorData.name} 
                    size="lg" 
                  />
                  {selectedCreatorData.isLive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-coral-pink text-white text-[10px] font-bold rounded uppercase">
                      Live
                    </span>
                  )}
                </div>
                
                {/* Creator Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-semibold flex items-center gap-1.5">
                    {selectedCreatorData.name}
                    {selectedCreatorData.isVerified && (
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </h3>
                  
                  {/* Stats Row - Compact */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                    <span>{formatViewerCount(selectedCreatorData.followers)} seguidores</span>
                    <span>{selectedCreatorData.streamCount} lives</span>
                    {selectedCreatorData.isLive && (
                      <span className="text-coral-pink">{formatViewerCount(selectedCreatorData.totalViewers)} assistindo</span>
                    )}
                  </div>
                </div>
                
                {/* Follow Button */}
                <button className="flex-shrink-0 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors">
                  Seguir
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>


        <div className="px-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {filterButtons.map((filter) => {
              const isActive = activeFilter === filter.id
              const Icon = filter.icon

              // Live filter - special coral/gold gradient
              if (filter.isLive) {
                return (
                  <motion.button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-coral-pink to-sunset-gold text-white shadow-lg shadow-coral-pink/30'
                        : 'bg-gradient-to-r from-coral-pink/20 to-sunset-gold/20 text-coral-pink border border-coral-pink/30 hover:from-coral-pink/30 hover:to-sunset-gold/30'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="relative flex items-center gap-2">
                      <span className="relative">
                        <Icon className="w-4 h-4" />
                        {!isActive && (
                          <motion.span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-coral-pink rounded-full"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </span>
                      <span>{filter.label}</span>
                      {filter.count !== undefined && filter.count > 0 && (
                        <span className={cn(
                          'px-1.5 py-0.5 text-xs rounded-full',
                          isActive ? 'bg-white/20' : 'bg-coral-pink/20'
                        )}>
                          {filter.count}
                        </span>
                      )}
                    </span>
                  </motion.button>
                )
              }

              // Creators filter - special purple/star style
              if (filter.isCreators) {
                return (
                  <motion.button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all text-sm',
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filter.label}</span>
                    {filter.count !== undefined && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-xs rounded-full',
                        isActive ? 'bg-white/20' : 'bg-purple-500/20'
                      )}>
                        {filter.count}
                      </span>
                    )}
                  </motion.button>
                )
              }

              return (
                <motion.button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all text-sm',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                  {filter.count !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 text-xs rounded-full',
                      isActive ? 'bg-white/20' : 'bg-gray-100'
                    )}>
                      {filter.count}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
          {/* Categories - Reimagined as visual cards (hide when in creators view) */}
          {!selectedCreator && activeFilter !== 'creators' && (
            <section className="mb-8">
              <h2 className="text-gray-900 font-bold text-lg mb-4">Categorias</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {categoryCards.map((category, index) => {
                  const isSelected = selectedCategory === category.id
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                      className={cn(
                        'relative group overflow-hidden rounded-xl aspect-[4/5] transition-all shadow-sm',
                        isSelected && 'ring-2 ring-primary'
                      )}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {/* Background Image */}
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-t opacity-90',
                        category.color
                      )} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <span className="text-3xl mb-1">{category.icon}</span>
                        <span className="text-white font-bold text-sm text-center">{category.name}</span>
                        <div className="flex items-center gap-1 mt-1 text-white/80 text-xs">
                          <Users className="w-3 h-3" />
                          <span>{category.viewers}</span>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <motion.div
                          className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter + (selectedCategory || '') + (selectedCreator || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* All Content */}
              {activeFilter === 'all' && (
                <>
                  {/* More Lives - Using creator-first variant */}
                  {filteredLiveStreams.length > 1 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-pink opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-coral-pink"></span>
                          </span>
                          {selectedCreator ? 'Lives do Criador' : 'Lives ao Vivo'}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLiveStreams.slice(selectedCreator ? 0 : 1, selectedCreator ? 6 : 4).map((stream, index) => (
                          <StreamCard 
                            key={stream.id} 
                            stream={stream} 
                            index={index} 
                            variant="creator-first"
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Upcoming */}
                  {filteredUpcomingStreams.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 font-semibold flex items-center gap-2">
                          <Clock className="w-5 h-5 text-sky-blue" />
                          Em Breve
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {filteredUpcomingStreams.slice(0, 2).map((stream, index) => (
                          <StreamCard
                            key={stream.id}
                            stream={stream}
                            variant="horizontal"
                            index={index}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Products */}
                  {filteredProducts.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 font-semibold flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                          {selectedCreator ? 'Produtos do Criador' : 'Produtos em Destaque'}
                        </h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.slice(0, 4).map((product, index) => (
                          <ProductCard key={product.id} product={product} index={index} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Live Only */}
              {activeFilter === 'live' && (
                <section className="mb-8">
                  {filteredLiveStreams.length === 0 ? (
                    <div className="text-center py-12">
                      <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {selectedCreator ? 'Este criador não está ao vivo no momento' : 'Nenhuma live ao vivo no momento'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredLiveStreams.map((stream, index) => (
                        <StreamCard 
                          key={stream.id} 
                          stream={stream} 
                          index={index}
                          variant="creator-first"
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Upcoming Only */}
              {activeFilter === 'upcoming' && (
                <section className="mb-8">
                  {filteredUpcomingStreams.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {selectedCreator ? 'Este criador não tem lives agendadas' : 'Nenhuma live agendada'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredUpcomingStreams.map((stream, index) => (
                        <StreamCard
                          key={stream.id}
                          stream={stream}
                          variant="creator-first"
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Creators Only */}
              {activeFilter === 'creators' && (
                <section className="mb-8">
                  <FeaturedCreators 
                    creators={creators} 
                    onSelect={(creatorId) => {
                      handleCreatorSelect(creatorId)
                      setActiveFilter('all')
                    }}
                    selectedCreator={selectedCreator}
                  />
                </section>
              )}

              {/* Products Only */}
              {activeFilter === 'products' && (
                <section className="mb-8">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {selectedCreator ? 'Este criador não tem produtos' : 'Nenhum produto encontrado'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredProducts.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ProductModal />
    </MainLayout>
  )
}
