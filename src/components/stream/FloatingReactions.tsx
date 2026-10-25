'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingReaction {
  id: number
  emoji: string
  x: number
  drift: number
  rotate: number
}

// Busy lives can send many reactions a second; only this many float at once
const MAX_ON_SCREEN = 30
let nextId = 0

// Reactions floating up the screen: everyone's, as they arrive from the live room
export function useFloatingReactions() {
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const add = useCallback((emoji: string) => {
    const reaction = {
      id: nextId++,
      emoji,
      x: 10 + Math.random() * 30,
      drift: (Math.random() - 0.5) * 20,
      rotate: (Math.random() - 0.5) * 30,
    }
    setReactions(prev => (prev.length >= MAX_ON_SCREEN ? prev : [...prev, reaction]))
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== reaction.id)), 2000)
  }, [])
  return { reactions, add }
}

export function FloatingReactions({ reactions, onTap }: { reactions: FloatingReaction[]; onTap?: () => void }) {
  return (
    <div
      className="absolute right-4 bottom-40 w-16 h-40 pointer-events-auto cursor-pointer"
      onClick={e => {
        e.stopPropagation()
        onTap?.()
      }}
    >
      <AnimatePresence>
        {reactions.map(reaction => (
          <motion.div
            key={reaction.id}
            className="absolute text-2xl pointer-events-none"
            initial={{ opacity: 1, y: 0, x: reaction.x, scale: 0.5 }}
            animate={{ opacity: 0, y: -150, x: reaction.x + reaction.drift, scale: 1, rotate: reaction.rotate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
