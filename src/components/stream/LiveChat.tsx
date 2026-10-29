'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { CHAT_MAX_LENGTH } from '@/realtime/protocol'
import type { RoomStatus } from '@/hooks/useLiveRoom'
import type { ChatMessage } from '@/types'
import { Send, Pin, ShoppingBag, Crown, Trash2 } from 'lucide-react'

interface LiveChatProps {
  messages: ChatMessage[]
  status: RoomStatus
  canChat: boolean
  // The live is over: the chat stays readable but closed
  ended?: boolean
  isHost: boolean
  hostId: string
  error: string
  onSend: (text: string) => boolean
  onDelete: (id: string) => void
  onClearError: () => void
}

const quickEmojis = ['❤️', '🔥', '😍', '👏', '😂', '🎉', '💯', '✨']

export function LiveChat({ messages, status, canChat, ended, isHost, hostId, error, onSend, onDelete, onClearError }: LiveChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Follow new messages unless the viewer scrolled up to read older ones
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120
    if (nearBottom) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(onClearError, 4000)
    return () => clearTimeout(timer)
  }, [error, onClearError])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return
    if (onSend(text)) setInputValue('')
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
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {status !== 'open' && messages.length === 0 && (
          <p className="text-white/40 text-sm text-center py-4">
            {status === 'connecting' ? 'Conectando ao chat…' : 'Chat indisponível. Tentando reconectar…'}
          </p>
        )}
        {status === 'open' && messages.length === 0 && (
          <p className="text-white/40 text-sm text-center py-4">Seja o primeiro a comentar!</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map(message => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isFromHost={message.user.id === hostId}
              onDelete={isHost ? () => onDelete(message.id) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>

      {error && <p className="px-4 py-1 text-coral-pink text-xs">{error}</p>}

      {/* Quick Emojis */}
      <AnimatePresence>
        {showEmojis && canChat && !ended && (
          <motion.div
            className="px-4 py-2 flex gap-2 border-t border-white/10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {quickEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setInputValue(prev => prev + emoji)
                  inputRef.current?.focus()
                }}
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
        {ended ? (
          <p className="h-10 leading-10 text-center text-white/50 text-sm">O chat foi encerrado com a live</p>
        ) : canChat ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              aria-label="Emojis"
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                showEmojis ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
              )}
            >
              <span className="text-lg">😊</span>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              maxLength={CHAT_MAX_LENGTH}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={status === 'open' ? 'Envie uma mensagem...' : 'Reconectando…'}
              disabled={status !== 'open'}
              className="flex-1 h-10 px-4 rounded-full bg-white/10 text-white placeholder:text-white/40 outline-none focus:bg-white/15 transition-colors text-sm disabled:opacity-60"
            />
            <Button
              variant="primary"
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || status !== 'open'}
              className="w-10 h-10"
              aria-label="Enviar"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full h-10 leading-10 rounded-full bg-white/10 text-white/70 text-sm text-center hover:bg-white/15"
          >
            Entre para participar do chat
          </Link>
        )}
      </div>
    </div>
  )
}

function ChatMessageItem({
  message,
  isFromHost,
  onDelete,
}: {
  message: ChatMessage
  isFromHost: boolean
  onDelete?: () => void
}) {
  const { user, message: text, type, isPinned } = message

  if (type === 'purchase') {
    return (
      <motion.div
        className="flex items-center gap-2 py-1 px-2 rounded-lg bg-tropical-green/10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
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
      className={cn('group flex items-start gap-2 py-1', isPinned && 'bg-sunset-gold/10 rounded-lg px-2')}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Avatar src={user.avatar} alt={user.name} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-medium', isFromHost ? 'text-sunset-gold' : user.isVerified ? 'text-tropical-green' : 'text-sky-blue')}>
            {user.name}
          </span>
          {isFromHost && <Crown className="w-3 h-3 text-sunset-gold" aria-label="Apresentador" />}
        </div>
        <p className="text-white/90 text-sm break-words">{text}</p>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Apagar mensagem"
          className="lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 w-6 h-6 flex items-center justify-center text-white/40 hover:text-coral-pink"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  )
}
