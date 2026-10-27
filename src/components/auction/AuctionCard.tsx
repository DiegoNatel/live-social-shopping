'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { SwipeToBid } from './SwipeToBid'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatViewerCount } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Gavel, Clock, Users, TrendingUp, Minus, Plus, AlertCircle } from 'lucide-react'
import type { Auction, AuctionBid } from '@/types'

interface AuctionCardProps {
  auction: Auction
  onBid: (amount: number) => void
  className?: string
}

export function AuctionCard({ auction, onBid, className }: AuctionCardProps) {
  // The first bid may be the starting price; later ones must beat the current bid
  const minBid = auction.bids.length > 0 ? auction.currentBid + auction.minimumIncrement : auction.currentBid
  const [bidAmount, setBidAmount] = useState(minBid)
  const [timeLeft, setTimeLeft] = useState('')
  const [showBidHistory, setShowBidHistory] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  // Someone else bid: the next bid has to beat the new price
  useEffect(() => {
    setBidAmount(prev => Math.max(prev, minBid))
  }, [minBid])
  
  // Calculate time remaining
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const end = new Date(auction.endTime).getTime()
      const diff = end - now
      
      if (diff <= 0) {
        setTimeLeft('Encerrado')
        return
      }
      
      // Check if ending soon (less than 5 minutes)
      setIsEnding(diff < 5 * 60 * 1000)
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auction.endTime])
  
  const incrementBid = () => {
    setBidAmount(prev => prev + auction.minimumIncrement)
  }
  
  const decrementBid = () => {
    setBidAmount(prev => Math.max(minBid, prev - auction.minimumIncrement))
  }
  
  const handleBidConfirmed = () => {
    onBid(bidAmount)
  }
  
  const isActive = auction.status === 'active'
  const recentBids = auction.bids.slice(-5).reverse()

  return (
    <motion.div
      className={cn(
        'rounded-2xl overflow-hidden bg-white shadow-xl border border-gray-100',
        isEnding && isActive && 'ring-2 ring-red-400 ring-offset-2',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Product Image */}
      <div className="relative aspect-square">
        <Image
          src={auction.product.images[0]}
          alt={auction.product.name}
          fill
          className="object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <motion.div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
              isActive 
                ? isEnding 
                  ? 'bg-red-500 text-white' 
                  : 'bg-orange-500 text-white'
                : auction.status === 'upcoming'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
            )}
            animate={isEnding ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Gavel className="w-4 h-4" />
            {isActive ? 'Leilão Ativo' : auction.status === 'upcoming' ? 'Em Breve' : 'Encerrado'}
          </motion.div>
        </div>
        
        {/* Timer */}
        {isActive && (
          <div className="absolute top-3 right-3">
            <motion.div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-md',
                isEnding 
                  ? 'bg-red-500/90 text-white' 
                  : 'bg-black/70 text-white'
              )}
              animate={isEnding ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Clock className="w-4 h-4" />
              {timeLeft}
            </motion.div>
          </div>
        )}
        
        {/* Bid Count */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-gray-700 text-sm font-medium">
            <Users className="w-4 h-4" />
            {auction.bids.length} lances
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Product Info */}
        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
          {auction.product.name}
        </h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2">
          {auction.product.description}
        </p>
        
        {/* Pricing Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Lance Inicial</p>
            <p className="font-semibold text-gray-700">{formatCurrency(auction.startingPrice)}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
            <p className="text-xs text-orange-600 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Lance Atual
            </p>
            <p className="font-bold text-orange-600 text-lg">{formatCurrency(auction.currentBid)}</p>
          </div>
        </div>
        
        {/* Highest Bidder */}
        {auction.bids.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded-lg border border-green-200">
            <Avatar
              src={auction.bids[auction.bids.length - 1].user.avatar}
              alt={auction.bids[auction.bids.length - 1].user.name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-700">Maior lance por</p>
              <p className="text-sm font-semibold text-green-800 truncate">
                {auction.bids[auction.bids.length - 1].user.name}
              </p>
            </div>
          </div>
        )}
        
        {/* Bid Amount Selector */}
        {isActive && (
          <>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={decrementBid}
                disabled={bidAmount <= minBid}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">Incremento: {formatCurrency(auction.minimumIncrement)}</p>
              </div>
              
              <button
                onClick={incrementBid}
                className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Swipe to Bid */}
            <SwipeToBid
              bidAmount={bidAmount}
              onBidConfirmed={handleBidConfirmed}
              disabled={!isActive}
            />
          </>
        )}
        
        {/* Bid History Toggle */}
        {auction.bids.length > 0 && (
          <button
            onClick={() => setShowBidHistory(!showBidHistory)}
            className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showBidHistory ? 'Ocultar histórico' : 'Ver histórico de lances'}
          </button>
        )}
        
        {/* Bid History */}
        <AnimatePresence>
          {showBidHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                {recentBids.map((bid, index) => (
                  <motion.div
                    key={bid.id}
                    className="flex items-center justify-between text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={bid.user.avatar}
                        alt={bid.user.name}
                        size="xs"
                      />
                      <span className="text-gray-600 truncate max-w-[120px]">
                        {bid.user.name}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(bid.amount)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Warning for ending soon */}
        {isEnding && isActive && (
          <motion.div
            className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-lg border border-red-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Este leilão está prestes a encerrar! Faça seu lance agora.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

