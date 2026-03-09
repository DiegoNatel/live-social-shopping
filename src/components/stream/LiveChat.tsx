'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { mockChatMessages, currentUser, mockUsers } from '@/data/mock-data'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'
import { Send, Gift, Pin, ShoppingBag, Crown } from 'lucide-react'

interface LiveChatProps {
  streamId: string
}

const quickEmojis = ['❤️', '🔥', '😍', '👏', '😂', '🎉', '💯', '✨']

export function LiveChat({ streamId }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [inputValue, setInputValue] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simulate incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)]
      const randomMessages = [
        'Amei! 😍',
        'Qual o preço?',
        'Tem no tamanho M?',
        'Lindo demais!',
        'Quero!!! 🔥',
        'Ainda tem?',
        'Perfeito!',
        'Comprei! 🛍️',
        'Quanto fica o frete?',
        '❤️❤️❤️',
      ]
      
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        user: randomUser,
        message: randomMessages[Math.floor(Math.random() * randomMessages.length)],
        timestamp: new Date(),
        type: Math.random() > 0.9 ? 'purchase' : 'text',
      }
      
      setMessages(prev => [...prev.slice(-50), newMessage])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: currentUser,
      message: inputValue,
      timestamp: new Date(),
      type: 'text',
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji)
    inputRef.current?.focus()
  }

  const pinnedMessage = messages.find(m => m.isPinned)

  return (
    <div className="flex flex-col h-full">
      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="px-4 py-2 bg-sunset-gold/10 border-b border-sunset-gold/20">
          <div className="flex items-center gap-2">
            <Pin className="w-3 h-3 text-sunset-gold" />
            <span className="text-sunset-gold text-xs font-medium">Mensagem fixada</span>
          </div>
          <p className="text-white text-sm mt-1 line-clamp-2">{pinnedMessage.message}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <ChatMessageItem key={message.id} message={message} index={index} />
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Quick Emojis */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            className="px-4 py-2 flex gap-2 border-t border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
              showEmojis ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
            )}
          >
            <span className="text-lg">😊</span>
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Envie uma mensagem..."
              className="w-full h-10 px-4 pr-12 rounded-full bg-white/10 text-white placeholder:text-white/40 outline-none focus:bg-white/15 transition-colors text-sm"
            />
          </div>
          
          <button
            onClick={() => {/* Gift modal */}}
            className="w-10 h-10 rounded-full bg-sunset-gold/20 flex items-center justify-center text-sunset-gold hover:bg-sunset-gold/30 transition-colors"
          >
            <Gift className="w-5 h-5" />
          </button>
          
          <Button
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-10 h-10"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Chat Message Item Component
function ChatMessageItem({ message, index }: { message: ChatMessage; index: number }) {
  const { user, message: text, type, isPinned } = message

  if (type === 'purchase') {
    return (
      <motion.div
        className="flex items-center gap-2 py-1 px-2 rounded-lg bg-tropical-green/10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
      >
        <ShoppingBag className="w-4 h-4 text-tropical-green" />
        <Avatar src={user.avatar} alt={user.name} size="xs" />
        <span className="text-tropical-green text-sm font-medium">{user.name}</span>
        <span className="text-white/60 text-sm">acabou de comprar!</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(
        'flex items-start gap-2 py-1',
        isPinned && 'bg-sunset-gold/10 rounded-lg px-2'
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Avatar src={user.avatar} alt={user.name} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-medium',
            user.isVerified ? 'text-tropical-green' : 'text-sky-blue'
          )}>
            {user.name}
          </span>
          {user.isVerified && (
            <Crown className="w-3 h-3 text-sunset-gold" />
          )}
        </div>
        <p className="text-white/90 text-sm break-words">{text}</p>
      </div>
    </motion.div>
  )
}

