'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, animate, PanInfo } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { LiveBadge, ViewersBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProductCarousel } from '@/components/stream/ProductCarousel'
import { LiveChat } from '@/components/stream/LiveChat'
import { FloatingReactions } from '@/components/stream/FloatingReactions'
import { PollWidget } from '@/components/stream/PollWidget'
import { FlashSaleTimer } from '@/components/stream/FlashSaleTimer'
import { ProductModal } from '@/components/product/ProductModal'
import { AuctionCard } from '@/components/auction/AuctionCard'
import type { Stream, Poll, FlashSale, Auction } from '@/types'
import { useUserStore, useUIStore } from '@/store'
import { formatViewerCount } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  Share2,
  Volume2,
  VolumeX,
  Maximize,
  Heart,
  Gift,
  MessageCircle,
} from 'lucide-react'

interface LiveStreamViewProps {
  stream: Stream | null
  poll: (Poll & { myVote?: string }) | null
  flashSale: FlashSale | null
  auctions: Auction[]
}

export function LiveStreamView({ stream, poll, flashSale, auctions }: LiveStreamViewProps) {
  const router = useRouter()
  const { isFollowing, followHost, unfollowHost, isAuthenticated } = useUserStore()
  const { openProductModal } = useUIStore()
  
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [showPoll, setShowPoll] = useState(true)
  const [bidMessage, setBidMessage] = useState('')
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || 0)
  const [chatHeight, setChatHeight] = useState(50) // percentage of viewport height
  
  const videoRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chatPanelRef = useRef<HTMLDivElement>(null)
  
  // Motion values for chat panel drag
  const y = useMotionValue(0)
  
  // Handle drag end to snap to positions
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const viewportHeight = window.innerHeight
    const draggedPixels = info.offset.y
    const draggedPercent = (draggedPixels / viewportHeight) * 100
    
    // Calculate new height based on drag direction
    let newHeight = chatHeight - draggedPercent
    
    // Snap points: 25%, 50%, 75%
    if (newHeight < 15) {
      // If dragged too low, close chat
      setIsChatOpen(false)
      setChatHeight(50)
    } else if (newHeight < 37.5) {
      setChatHeight(25)
    } else if (newHeight < 62.5) {
      setChatHeight(50)
    } else {
      setChatHeight(75)
    }
    
    // Reset motion value
    animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
  }, [chatHeight, y])

  // Simulate changing viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 10) - 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current)
    }
    
    if (showControls) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current)
      }
    }
  }, [showControls])

  const handleVideoClick = () => {
    setShowControls(true)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && videoRef.current) {
      videoRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-deep-ocean flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-xl font-semibold mb-2">Stream não encontrada</h1>
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    )
  }

  const isUserFollowing = isFollowing(stream.host.id)

  const placeBid = async (auctionId: string, amount: number) => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setBidMessage('')
    const res = await fetch(`/api/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      setBidMessage(data?.message ?? 'Não foi possível registrar o lance.')
    }
    router.refresh()
  }

  const votePoll = async (optionId: string) => {
    if (!isAuthenticated || !poll) {
      router.push('/login')
      return false
    }
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    })
    return res.ok
  }

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (isUserFollowing) unfollowHost(stream.host.id)
    else followHost(stream.host.id)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      {/* Video Section */}
      <div 
        ref={videoRef}
        className="relative w-full lg:flex-1 h-screen lg:h-screen"
        onClick={handleVideoClick}
      >
        {/* Video Background */}
        <div className="absolute inset-0">
          <Image
            src={stream.thumbnail}
            alt={stream.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
        </div>

        {/* === MOBILE LAYOUT === */}
        <div className="lg:hidden absolute inset-0 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-3 z-20">
            <div className="flex items-center gap-2">
              <Link href="/">
                <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </Link>
              <LiveBadge />
              <ViewersBadge count={viewerCount} />
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Host Info Bar */}
          <div className="px-3 z-10">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm">
              <Avatar
                src={stream.host.avatar}
                alt={stream.host.name}
                size="sm"
                isVerified={stream.host.isVerified}
                isLive
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm truncate">{stream.host.name}</h3>
                <p className="text-white/60 text-xs">{formatViewerCount(stream.host.followers)} seguidores</p>
              </div>
              <Button
                variant={isUserFollowing ? 'ghost' : 'primary'}
                size="sm"
                className="text-xs px-3 py-1"
                onClick={(e) => { e.stopPropagation(); toggleFollow(); }}
              >
                {isUserFollowing ? 'Seguindo' : 'Seguir'}
              </Button>
            </div>
          </div>

          {/* Spacer - Video area */}
          <div className="flex-1 relative">
            {/* Floating Reactions in the middle */}
            <FloatingReactions />
          </div>

          {/* Bottom Section - Products + Actions */}
          <div className="z-10">
            {/* Stream Title */}
            <div className="px-3 pb-2">
              <h1 className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">
                {stream.title}
              </h1>
            </div>

            {/* Products Carousel */}
            <div className="pb-2">
              <ProductCarousel 
                products={stream.products} 
                onProductClick={(product) => openProductModal(product)}
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-3">
                <ActionButton 
                  icon={<Heart className="w-5 h-5" />} 
                  label="23K" 
                  active={false}
                />
                <ActionButton 
                  icon={<MessageCircle className="w-5 h-5" />} 
                  label="Chat" 
                  active={isChatOpen}
                  onClick={() => setIsChatOpen(!isChatOpen)}
                />
                <ActionButton 
                  icon={<Gift className="w-5 h-5" />} 
                  label="Presente" 
                  active={false}
                />
              </div>
              
              {/* Flash Sale Indicator */}
              {flashSale && (
                <motion.button
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-coral-pink to-sunset-gold text-white text-xs font-semibold"
                  onClick={(e) => { e.stopPropagation(); openProductModal(flashSale.product); }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>⚡</span>
                  <span>Oferta</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* === DESKTOP LAYOUT === */}
        <div className="hidden lg:block">
          {/* Top Controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center gap-3">
                  <Link href="/">
                    <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  </Link>
                  <LiveBadge />
                  <ViewersBadge count={viewerCount} />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host Info - Desktop */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                className="absolute top-20 left-4 z-10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 backdrop-blur-sm">
                  <Avatar
                    src={stream.host.avatar}
                    alt={stream.host.name}
                    size="lg"
                    isVerified={stream.host.isVerified}
                    isLive
                  />
                  <div>
                    <h3 className="text-white font-semibold">{stream.host.name}</h3>
                    <p className="text-white/60 text-sm">{formatViewerCount(stream.host.followers)} seguidores</p>
                  </div>
                  <Button
                    variant={isUserFollowing ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => toggleFollow()}
                  >
                    {isUserFollowing ? 'Seguindo' : 'Seguir'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls - Desktop */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                className="absolute bottom-4 left-4 right-4 z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="max-w-lg">
                  <h1 className="text-white font-semibold text-xl mb-3">{stream.title}</h1>
                  {flashSale && <FlashSaleTimer flashSale={flashSale} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FloatingReactions />
        </div>
      </div>

      {/* Side Panel - Desktop */}
      <div className="hidden lg:flex lg:w-96 flex-col h-screen bg-deep-ocean border-l border-white/10">
        {/* Poll Widget */}
        <AnimatePresence>
          {showPoll && poll && (
            <motion.div
              className="p-4 border-b border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <PollWidget poll={poll} myVote={poll.myVote} onVote={votePoll} onClose={() => setShowPoll(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auctions */}
        {auctions.some(a => a.status === 'active') && (
          <div className="p-4 border-b border-white/10 space-y-3 max-h-[50vh] overflow-y-auto">
            {bidMessage && <p className="text-coral-pink text-sm">{bidMessage}</p>}
            {auctions
              .filter(a => a.status === 'active')
              .map(auction => (
                <AuctionCard key={auction.id} auction={auction} onBid={amount => placeBid(auction.id, amount)} />
              ))}
          </div>
        )}

        {/* Products */}
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tropical-green animate-pulse" />
            Produtos da Live ({stream.products.length})
          </h3>
          <ProductCarousel 
            products={stream.products} 
            onProductClick={(product) => openProductModal(product)}
            variant="vertical"
          />
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <LiveChat streamId={stream.id} />
        </div>
      </div>

      {/* Mobile Chat Panel - Draggable */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            ref={chatPanelRef}
            className="fixed inset-x-0 bottom-0 bg-deep-ocean backdrop-blur-lg rounded-t-2xl lg:hidden flex flex-col z-30"
            style={{ height: `${chatHeight}vh`, y }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag Handle */}
            <motion.div
              className="flex flex-col items-center py-2 cursor-grab active:cursor-grabbing touch-none border-b border-white/10"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              style={{ y }}
            >
              <div className="w-10 h-1 bg-white/30 rounded-full mb-2" />
              <div className="flex items-center gap-3">
                {[25, 50, 75].map((height) => (
                  <button
                    key={height}
                    onClick={() => setChatHeight(height)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      chatHeight === height
                        ? 'bg-tropical-green text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    )}
                  >
                    {height === 25 ? 'Min' : height === 50 ? 'Médio' : 'Max'}
                  </button>
                ))}
              </div>
            </motion.div>
            
            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <LiveChat streamId={stream.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <ProductModal />
    </div>
  )
}

// Action Button Component - Horizontal style for bottom bar
interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
}

function ActionButton({ icon, label, onClick, active }: ActionButtonProps) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-full transition-all',
        active 
          ? 'bg-sky-blue/20 text-sky-blue' 
          : 'bg-black/40 backdrop-blur-sm text-white hover:bg-black/60'
      )}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  )
}

