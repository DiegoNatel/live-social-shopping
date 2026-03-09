'use client'

import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { formatViewerCount, cn } from '@/lib/utils'
import type { User } from '@/types'
import { Users, Star, TrendingUp } from 'lucide-react'

interface CreatorWithMeta extends User {
  isLive?: boolean
  streamCount?: number
}

interface FeaturedCreatorsProps {
  creators: CreatorWithMeta[]
  onSelect: (creatorId: string) => void
  selectedCreator?: string | null
}

export function FeaturedCreators({ creators, onSelect, selectedCreator }: FeaturedCreatorsProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-sunset-gold" />
        <h2 className="text-white font-bold text-lg">Criadores em Destaque</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {creators.slice(0, 4).map((creator, index) => {
          const isSelected = selectedCreator === creator.id
          return (
            <motion.button
              key={creator.id}
              onClick={() => onSelect(creator.id)}
              className={cn(
                'relative p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border transition-all group text-left',
                isSelected 
                  ? 'border-tropical-green ring-2 ring-tropical-green/30' 
                  : 'border-white/10 hover:border-white/20'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Live indicator */}
              {creator.isLive && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-coral-pink text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  className="absolute top-3 left-3 w-5 h-5 bg-tropical-green rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              {/* Avatar - Clean design, no ring offset */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                <Avatar
                  src={creator.avatar}
                  alt={creator.name}
                  size="xl"
                  className={cn(
                    'relative',
                    creator.isLive && 'ring-2 ring-coral-pink'
                  )}
                />
              </div>

              {/* Creator info */}
              <div className="text-center">
                <h3 className="font-bold text-white flex items-center justify-center gap-1">
                  {creator.name}
                  {creator.isVerified && (
                    <svg className="w-4 h-4 text-tropical-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </h3>
                <p className="text-white/50 text-xs mt-1 line-clamp-1">{creator.bio}</p>
                
                {/* Stats */}
                <div className="flex items-center justify-center gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1 text-white/60">
                    <Users className="w-3 h-3" />
                    {formatViewerCount(creator.followers)}
                  </span>
                  {creator.isLive && (
                    <span className="flex items-center gap-1 text-coral-pink">
                      <TrendingUp className="w-3 h-3" />
                      Ao vivo
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

