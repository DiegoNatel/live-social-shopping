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
import { FloatingReactions, useFloatingReactions } from '@/components/stream/FloatingReactions'
import { PollWidget } from '@/components/stream/PollWidget'
import { FlashSaleTimer } from '@/components/stream/FlashSaleTimer'
import { ProductModal } from '@/components/product/ProductModal'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { HostPanel } from '@/components/stream/HostPanel'
import { LiveVideo } from '@/components/stream/LiveVideo'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import type { ServerMessage } from '@/realtime/protocol'
import type { Stream, Poll, FlashSale, Auction, Product } from '@/types'
import { useUserStore, useUIStore } from '@/store'
import { formatCurrency, formatViewerCount } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  Share2,
  Volume2,
  VolumeX,
  Maximize,
  Heart,
  MessageCircle,
  Gavel,
  BarChart2,
  Wrench,
} from 'lucide-react'

interface LiveStreamViewProps {
  stream: Stream | null
  poll: (Poll & { myVote?: string }) | null
  flashSale: FlashSale | null
  auctions: Auction[]
}

export function LiveStreamView({ stream, ...initial }: LiveStreamViewProps) {
  const router = useRouter()
  const { isFollowing, followHost, unfollowHost, isAuthenticated } = useUserStore()
  const { openProductModal } = useUIStore()
  
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [showPoll, setShowPoll] = useState(true)
  const [bidMessage, setBidMessage] = useState('')
  const [notice, setNotice] = useState<{ text: string; href?: string } | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'poll' | 'auctions' | 'host' | null>(null)

  // Server data, then kept up to date by the live room
  const [poll, setPoll] = useState(initial.poll)
  const [flashSale, setFlashSale] = useState(initial.flashSale)
  const [auctions, setAuctions] = useState(initial.auctions)
  const [pinnedId, setPinnedId] = useState(stream?.pinnedProductId ?? null)
  const [pinnedExtra, setPinnedExtra] = useState<Product | null>(null)
  const [hasEnded, setHasEnded] = useState(false)
  const [likes, setLikes] = useState(stream?.likes ?? 0)
  // Fresh copies of products whose price changed during the live (flash sales)
  const [productOverrides, setProductOverrides] = useState<Record<string, Product>>({})
  // Ticks so auctions open, and polls and flash sales expire, on time. null until mounted,
  // so the first client render matches the server's.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  const refreshProduct = useCallback((id: string) => {
    fetch('/api/cart/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
      .then(r => (r.ok ? (r.json() as Promise<Product[]>) : []))
      .then(([fresh]) => fresh && setProductOverrides(o => ({ ...o, [id]: fresh })))
      .catch(() => {})
  }, [])
  const floating = useFloatingReactions()

  const handleRoomEvent = useCallback(
    (msg: ServerMessage) => {
      switch (msg.t) {
        case 'react':
          floating.add(msg.emoji)
          if (msg.emoji === '❤️') setLikes(n => n + 1)
          break
        case 'bid':
          setAuctions(list =>
            list.map(a =>
              a.id === msg.auctionId
                ? { ...a, currentBid: msg.currentBid, endTime: msg.endTime, bids: [...a.bids, msg.bid] }
                : a
            )
          )
          break
        case 'auction':
          setAuctions(list => [...list.filter(a => a.id !== msg.auction.id), msg.auction])
          break
        case 'auction_end': {
          setAuctions(list => list.map(a => (a.id === msg.auctionId ? { ...a, status: 'ended', winnerId: msg.winner?.id } : a)))
          const product = auctions.find(a => a.id === msg.auctionId)?.product.name ?? 'o produto'
          const me = useUserStore.getState().user?.id
          setNotice(
            msg.winner?.id && msg.winner.id === me
              ? { text: `🎉 Você arrematou ${product} por ${formatCurrency(msg.amount)}!`, href: `/auctions/${msg.auctionId}` }
              : msg.winner
                ? { text: `🔨 ${msg.winner.name} arrematou ${product} por ${formatCurrency(msg.amount)}!` }
                : { text: `O leilão de ${product} terminou sem lances.` }
          )
          break
        }
        case 'poll':
          setPoll(msg.poll ? { ...msg.poll, myVote: poll?.id === msg.poll.id ? poll.myVote : undefined } : null)
          if (msg.poll) setShowPoll(true)
          break
        case 'flash': {
          // New sale price for its product; the previous sale's product goes back to its price
          const previous = flashSale?.product.id
          if (msg.flashSale) {
            const product = msg.flashSale.product
            setProductOverrides(o => ({ ...o, [product.id]: product }))
          }
          if (previous && previous !== msg.flashSale?.product.id) refreshProduct(previous)
          setFlashSale(msg.flashSale)
          break
        }
        case 'pin':
          setPinnedId(msg.productId)
          break
        case 'products':
          router.refresh()
          break
        case 'status':
          if (msg.status === 'ended') setHasEnded(true)
          else router.refresh()
          break
      }
    },
    [floating, auctions, poll, flashSale, refreshProduct, router]
  )
  const room = useLiveRoom(stream?.id ?? '', handleRoomEvent)
  const viewerCount = room.viewers ?? stream?.viewerCount ?? 0

  // A pinned product that isn't in the stream's list is loaded on demand
  const products = (stream?.products ?? []).map(p => productOverrides[p.id] ?? p)
  const pinnedProduct = pinnedId ? (products.find(p => p.id === pinnedId) ?? (pinnedExtra?.id === pinnedId ? pinnedExtra : null)) : null

  // What's open right now, by the clock
  const activePoll = poll && (!poll.endsAt || now === null || Date.parse(String(poll.endsAt)) > now) ? poll : null
  const activeFlash = flashSale && (now === null || Date.parse(String(flashSale.endTime)) > now) ? flashSale : null
  const activeAuctions = auctions.filter(a =>
    now === null
      ? a.status === 'active'
      : a.status !== 'ended' && Date.parse(String(a.startTime)) <= now && Date.parse(String(a.endTime)) > now
  )

  // A flash sale that ran out of time: its product goes back to the regular price
  const expiredFlashProduct = flashSale && !activeFlash ? flashSale.product.id : null
  useEffect(() => {
    if (expiredFlashProduct) refreshProduct(expiredFlashProduct)
  }, [expiredFlashProduct, refreshProduct])
  useEffect(() => {
    if (!pinnedId || stream?.products.some(p => p.id === pinnedId)) return
    fetch('/api/cart/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [pinnedId] }) })
      .then(r => (r.ok ? (r.json() as Promise<Product[]>) : []))
      .then(list => setPinnedExtra(list[0] ?? null))
      .catch(() => {})
  }, [pinnedId, stream?.products])

  useEffect(() => {
    if (!notice) return
    // The winner's notice stays until they act on it
    if (notice.href) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])
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
    // Without the live room, reload to see the new price
    if (room.status !== 'open') router.refresh()
  }

  const toggleMobilePanel = (panel: 'poll' | 'auctions' | 'host') => {
    const opening = mobilePanel !== panel
    setMobilePanel(opening ? panel : null)
    if (opening) setIsChatOpen(false)
  }

  const sendHeart = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (room.sendReaction('❤️')) {
      floating.add('❤️')
      setLikes(n => n + 1)
    }
  }

  const share = () => {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: stream.title, url }).catch(() => {})
    else navigator.clipboard.writeText(url).then(() => setNotice({ text: 'Link copiado!' }))
  }

  const chat = (
    <LiveChat
      messages={room.messages}
      status={room.status}
      canChat={room.canChat}
      ended={hasEnded || !!stream.hasEnded}
      isHost={room.isHost}
      hostId={stream.host.id}
      error={room.error}
      onSend={room.sendChat}
      onDelete={room.deleteMessage}
      onClearError={room.clearError}
    />
  )

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
          <LiveVideo
            streamId={stream.id}
            isLive={stream.isLive && !hasEnded}
            thumbnail={stream.thumbnail}
            title={stream.title}
            recordingUrl={stream.videoUrl}
            muted={isMuted}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />
        </div>

        {/* === MOBILE LAYOUT === */}
        {/* Leaves room for the chat panel so the products and action bar stay above it */}
        <div
          className="lg:hidden absolute inset-0 flex flex-col transition-[padding] duration-300"
          style={{ paddingBottom: isChatOpen ? `${chatHeight}vh` : 0 }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between p-3 z-20">
            <div className="flex items-center gap-2">
              <Link href="/">
                <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </Link>
              <StatusBadge isLive={stream.isLive} hasEnded={hasEnded || !!stream.hasEnded} />
              <ViewersBadge count={viewerCount} />
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); share(); }}
                aria-label="Compartilhar"
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              >
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
            <FloatingReactions reactions={floating.reactions} onTap={sendHeart} />

            {/* Poll / auctions / host tools, opened from the action bar */}
            <AnimatePresence>
              {mobilePanel && (
                <motion.div
                  className="absolute inset-x-3 bottom-2 max-h-full overflow-y-auto z-20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  {mobilePanel === 'poll' && activePoll && (
                    <PollWidget key={activePoll.id} poll={activePoll} myVote={activePoll.myVote} onVote={votePoll} live={room.status === 'open'} onClose={() => setMobilePanel(null)} />
                  )}
                  {mobilePanel === 'auctions' && (
                    <div className="space-y-2">
                      {bidMessage && <p className="text-coral-pink text-sm bg-black/60 rounded px-2 py-1">{bidMessage}</p>}
                      {activeAuctions.map(auction => (
                        <AuctionCard key={auction.id} auction={auction} onBid={amount => placeBid(auction.id, amount)} />
                      ))}
                    </div>
                  )}
                  {mobilePanel === 'host' && room.isHost && (
                    <HostPanel stream={stream} pinnedId={pinnedId} hasPoll={!!activePoll} hasFlashSale={!!activeFlash} onClose={() => setMobilePanel(null)} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Section - Products + Actions */}
          <div className="z-10">
            {/* Stream Title (hidden when the chat takes most of the screen) */}
            <div className={cn('px-3 pb-2', isChatOpen && chatHeight === 75 && 'hidden')}>
              <h1 className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">
                {stream.title}
              </h1>
            </div>

            {pinnedProduct && (
              <div className="px-3 pb-2">
                <PinnedProduct product={pinnedProduct} onOpen={() => openProductModal(pinnedProduct)} />
              </div>
            )}

            {/* Products Carousel */}
            <div className={cn('pb-2', isChatOpen && chatHeight === 75 && 'hidden')}>
              <ProductCarousel 
                products={products}
                onProductClick={(product) => openProductModal(product)}
              />
            </div>

            {/* Action Bar */}
            {/* Scrolls sideways when a live has an auction, a poll and host tools at once */}
            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
                <ActionButton
                  icon={<Heart className="w-5 h-5" />}
                  label={formatViewerCount(likes)}
                  onClick={sendHeart}
                />
                <ActionButton 
                  icon={<MessageCircle className="w-5 h-5" />} 
                  label="Chat" 
                  active={isChatOpen}
                  onClick={() => {
                    // The chat and a poll/auction panel don't both fit on a phone
                    if (!isChatOpen) setMobilePanel(null)
                    setIsChatOpen(!isChatOpen)
                  }}
                />
                {activeAuctions.length > 0 && (
                  <ActionButton
                    icon={<Gavel className="w-5 h-5" />}
                    label="Leilão"
                    active={mobilePanel === 'auctions'}
                    onClick={() => toggleMobilePanel('auctions')}
                  />
                )}
                {activePoll && (
                  <ActionButton
                    icon={<BarChart2 className="w-5 h-5" />}
                    label="Enquete"
                    active={mobilePanel === 'poll'}
                    onClick={() => toggleMobilePanel('poll')}
                  />
                )}
                {room.isHost && (
                  <ActionButton
                    icon={<Wrench className="w-5 h-5" />}
                    label="Ferramentas"
                    active={mobilePanel === 'host'}
                    onClick={() => toggleMobilePanel('host')}
                  />
                )}
              </div>
              
              {/* Flash Sale Indicator */}
              {activeFlash && (
                <motion.button
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-coral-pink to-sunset-gold text-white text-xs font-semibold"
                  onClick={(e) => { e.stopPropagation(); openProductModal(activeFlash.product); }}
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
                  <StatusBadge isLive={stream.isLive} hasEnded={hasEnded || !!stream.hasEnded} />
                  <ViewersBadge count={viewerCount} />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={share}
                    aria-label="Compartilhar"
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                  >
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
                  {activeFlash && <FlashSaleTimer flashSale={activeFlash} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FloatingReactions reactions={floating.reactions} onTap={sendHeart} />
        </div>
      </div>

      {/* Side Panel - Desktop */}
      <div className="hidden lg:flex lg:w-96 flex-col h-screen bg-deep-ocean border-l border-white/10">
        {room.isHost && (
          <div className="p-4 border-b border-white/10">
            <HostPanel stream={stream} pinnedId={pinnedId} hasPoll={!!activePoll} hasFlashSale={!!activeFlash} />
          </div>
        )}

        {/* Poll Widget */}
        <AnimatePresence>
          {showPoll && activePoll && (
            <motion.div
              className="p-4 border-b border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <PollWidget key={activePoll.id} poll={activePoll} myVote={activePoll.myVote} onVote={votePoll} live={room.status === 'open'} onClose={() => setShowPoll(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auctions */}
        {activeAuctions.length > 0 && (
          <div className="p-4 border-b border-white/10 space-y-3 max-h-[50vh] overflow-y-auto">
            {bidMessage && <p className="text-coral-pink text-sm">{bidMessage}</p>}
            {activeAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} onBid={amount => placeBid(auction.id, amount)} />
            ))}
          </div>
        )}

        {pinnedProduct && (
          <div className="p-4 border-b border-white/10">
            <PinnedProduct product={pinnedProduct} onOpen={() => openProductModal(pinnedProduct)} />
          </div>
        )}

        {/* Products */}
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tropical-green animate-pulse" />
            Produtos da Live ({products.length})
          </h3>
          <ProductCarousel 
            products={products}
            onProductClick={(product) => openProductModal(product)}
            variant="vertical"
          />
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          {chat}
        </div>
      </div>

      {/* Mobile Chat Panel - Draggable */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            ref={chatPanelRef}
            className="fixed inset-x-0 bottom-0 bg-deep-ocean backdrop-blur-lg rounded-t-2xl lg:hidden flex flex-col z-30"
            // The slide-in uses its own y; the shared `y` motion value belongs to the drag handle
            style={{ height: `${chatHeight}vh` }}
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
              {chat}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auction results and other notices */}
      <AnimatePresence>
        {notice && (
          <motion.div
            className="fixed top-16 inset-x-0 mx-auto w-fit max-w-[90vw] z-40 px-4 py-2 rounded-full bg-black/80 text-white text-sm text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {notice.text}
            {notice.href && (
              <>
                {' '}
                <Link href={notice.href} className="underline font-semibold">
                  Finalizar compra
                </Link>
                <button onClick={() => setNotice(null)} aria-label="Fechar" className="ml-2 text-white/60">
                  ✕
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {hasEnded && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold mb-2">A live terminou</h2>
            <p className="text-white/60 text-sm mb-4">Obrigado por assistir! Siga {stream.host.name} para saber da próxima.</p>
            <Button onClick={() => router.push('/')}>Ver outras lives</Button>
          </div>
        </div>
      )}

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
        'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full transition-all',
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

function StatusBadge({ isLive, hasEnded }: { isLive: boolean; hasEnded: boolean }) {
  if (isLive && !hasEnded) return <LiveBadge />
  return (
    <span className="px-2 py-0.5 rounded bg-black/50 text-white/80 text-xs font-medium">
      {hasEnded ? 'Encerrada' : 'Agendada'}
    </span>
  )
}

// The product the host is showing right now
function PinnedProduct({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onOpen()
      }}
      className="w-full flex items-center gap-3 p-2 rounded-xl bg-white text-left shadow-lg"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {product.images[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-coral-pink text-[10px] font-bold uppercase">Mostrando agora</p>
        <p className="text-gray-900 text-sm font-medium truncate">{product.name}</p>
      </div>
      <span className="text-gray-900 font-semibold text-sm">{formatCurrency(product.price)}</span>
    </button>
  )
}
