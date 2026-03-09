'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Reaction {
  id: string
  emoji: string
  x: number
}

const emojis = ['❤️', '🔥', '😍', '👏', '✨', '💖', '🎉', '💯']

export function FloatingReactions() {
  const [reactions, setReactions] = useState<Reaction[]>([])

  const addReaction = useCallback(() => {
    const newReaction: Reaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: 10 + Math.random() * 30,
    }
    
    setReactions(prev => [...prev, newReaction])
    
    // Remove after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id))
    }, 2000)
  }, [])

  // Simulate reactions from other viewers
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        addReaction()
      }
    }, 800)

    return () => clearInterval(interval)
  }, [addReaction])

  // Add reaction on click
  const handleClick = () => {
    addReaction()
    addReaction()
    addReaction()
  }

  return (
    <div
      className="absolute right-4 bottom-40 w-16 h-40 pointer-events-auto cursor-pointer"
      onClick={handleClick}
    >
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            className="absolute text-2xl pointer-events-none"
            initial={{ 
              opacity: 1, 
              y: 0, 
              x: reaction.x,
              scale: 0.5 
            }}
            animate={{ 
              opacity: 0, 
              y: -150, 
              x: reaction.x + (Math.random() - 0.5) * 20,
              scale: 1,
              rotate: (Math.random() - 0.5) * 30
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2,
              ease: 'easeOut'
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

