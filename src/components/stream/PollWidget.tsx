'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import type { Poll } from '@/types'
import { X, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PollWidgetProps {
  poll: Poll
  myVote?: string
  // Saves the vote; resolves false if it wasn't recorded
  onVote?: (optionId: string) => Promise<boolean>
  onClose?: () => void
}

export function PollWidget({ poll, myVote, onVote, onClose }: PollWidgetProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(myVote ?? null)
  const [hasVoted, setHasVoted] = useState(!!myVote)
  const [voteCounts, setVoteCounts] = useState(
    poll.options.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.votes }), {} as Record<string, number>)
  )

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0)

  const handleVote = async () => {
    if (!selectedOption) return
    if (onVote && !(await onVote(selectedOption))) return
    
    setVoteCounts(prev => ({
      ...prev,
      [selectedOption]: prev[selectedOption] + 1
    }))
    setHasVoted(true)
  }

  const getPercentage = (optionId: string) => {
    const votes = voteCounts[optionId]
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
  }

  return (
    <motion.div
      className="glass rounded-xl p-4 w-full max-w-xs"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-sunset-gold text-xs font-medium mb-1">
            <span className="w-2 h-2 rounded-full bg-sunset-gold animate-pulse" />
            Enquete ao vivo
          </div>
          <h3 className="text-white font-semibold text-sm leading-tight">
            {poll.question}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage = getPercentage(option.id)
          const isSelected = selectedOption === option.id
          const isWinner = hasVoted && percentage === Math.max(...poll.options.map(o => getPercentage(o.id)))

          return (
            <motion.button
              key={option.id}
              onClick={() => !hasVoted && setSelectedOption(option.id)}
              disabled={hasVoted}
              className={cn(
                'relative w-full text-left rounded-lg overflow-hidden transition-all',
                hasVoted ? 'cursor-default' : 'cursor-pointer hover:bg-white/10',
                isSelected && !hasVoted && 'ring-2 ring-tropical-green'
              )}
              whileTap={{ scale: hasVoted ? 1 : 0.98 }}
            >
              {/* Progress bar background */}
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-lg',
                  isWinner ? 'bg-tropical-green/30' : 'bg-white/10'
                )}
                initial={{ width: 0 }}
                animate={{ width: hasVoted ? `${percentage}%` : 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              
              {/* Content */}
              <div className="relative px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!hasVoted ? (
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 transition-colors',
                      isSelected ? 'border-tropical-green bg-tropical-green' : 'border-white/40'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  ) : isWinner ? (
                    <Check className="w-4 h-4 text-tropical-green" />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <span className="text-white text-sm font-medium">{option.text}</span>
                </div>
                {hasVoted && (
                  <span className={cn(
                    'text-sm font-bold',
                    isWinner ? 'text-tropical-green' : 'text-white/60'
                  )}>
                    {percentage}%
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-white/60 text-xs">
          <Users className="w-3 h-3" />
          <span>{totalVotes} votos</span>
        </div>
        
        {!hasVoted ? (
          <Button
            size="sm"
            onClick={handleVote}
            disabled={!selectedOption}
            className="text-xs px-3 py-1.5"
          >
            Votar
          </Button>
        ) : (
          <span className="text-tropical-green text-xs font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Votou!
          </span>
        )}
      </div>
    </motion.div>
  )
}

