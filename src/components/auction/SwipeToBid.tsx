'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import { ChevronRight, Gavel, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeToBidProps {
  bidAmount: number
  onBidConfirmed: () => void
  disabled?: boolean
  className?: string
}

export function SwipeToBid({ bidAmount, onBidConfirmed, disabled = false, className }: SwipeToBidProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const trackWidth = 280 // Width of the slider track
  const thumbWidth = 64 // Width of the thumb
  const maxDrag = trackWidth - thumbWidth - 8 // Account for padding
  
  // Progress calculation (0 to 1)
  const progress = useTransform(x, [0, maxDrag], [0, 1])
  
  // Background color transitions from orange to green as you swipe
  const backgroundColor = useTransform(
    x,
    [0, maxDrag * 0.5, maxDrag],
    ['rgb(251, 146, 60)', 'rgb(250, 204, 21)', 'rgb(34, 197, 94)']
  )
  
  // Text opacity decreases as you swipe
  const textOpacity = useTransform(x, [0, maxDrag * 0.6], [1, 0])
  
  // Checkmark opacity increases at the end
  const checkOpacity = useTransform(x, [maxDrag * 0.7, maxDrag], [0, 1])
  
  const handleDragStart = () => {
    if (!disabled && !isComplete) {
      setIsDragging(true)
    }
  }
  
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Handled by motion
  }
  
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    
    if (disabled || isComplete) return
    
    const currentX = x.get()
    
    // If dragged more than 85% of the way, consider it complete
    if (currentX >= maxDrag * 0.85) {
      // Animate to end
      animate(x, maxDrag, { type: 'spring', stiffness: 300, damping: 30 })
      setIsComplete(true)
      
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      
      // Wait for animation then trigger callback
      setTimeout(() => {
        onBidConfirmed()
      }, 300)
    } else {
      // Snap back to start
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }, [disabled, isComplete, maxDrag, onBidConfirmed, x])

  const reset = useCallback(() => {
    setIsComplete(false)
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 })
  }, [x])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Bid Amount Display */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">Seu lance</p>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(bidAmount)}</p>
      </div>
      
      {/* Swipe Slider */}
      <div className="relative">
        <motion.div
          ref={constraintsRef}
          className={cn(
            'relative h-16 rounded-full overflow-hidden transition-opacity',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ 
            backgroundColor,
            width: trackWidth,
            margin: '0 auto'
          }}
        >
          {/* Shimmer Effect */}
          {!isComplete && !disabled && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: [-trackWidth, trackWidth],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}
          
          {/* Chevrons Animation (hint to swipe) */}
          {!isComplete && !disabled && (
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <motion.div
                className="flex items-center gap-0"
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronRight className="w-5 h-5 text-white/60" />
                <ChevronRight className="w-5 h-5 text-white/40 -ml-2" />
                <ChevronRight className="w-5 h-5 text-white/20 -ml-2" />
              </motion.div>
            </div>
          )}
          
          {/* Instruction Text */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: textOpacity }}
          >
            <span className="text-white font-semibold text-sm ml-10">
              Arraste para dar lance
            </span>
          </motion.div>
          
          {/* Success Checkmark */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: checkOpacity }}
          >
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </motion.div>
          
          {/* Draggable Thumb */}
          <motion.div
            className={cn(
              'absolute top-1 left-1 w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing',
              (disabled || isComplete) && 'cursor-not-allowed'
            )}
            drag={!disabled && !isComplete ? 'x' : false}
            dragConstraints={{ left: 0, right: maxDrag }}
            dragElastic={0}
            dragMomentum={false}
            style={{ x }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: disabled || isComplete ? 1 : 1.05 }}
          >
            {isComplete ? (
              <Check className="w-6 h-6 text-green-500" strokeWidth={3} />
            ) : (
              <Gavel className="w-6 h-6 text-orange-500" />
            )}
          </motion.div>
        </motion.div>
        
        {/* Pulse ring effect when dragging */}
        {isDragging && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-400"
            initial={{ width: 64, height: 64, opacity: 0.8 }}
            animate={{ 
              width: [64, 100], 
              height: [64, 100], 
              opacity: [0.8, 0] 
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* Status Text */}
      {isComplete && (
        <motion.p
          className="text-center text-green-600 font-medium text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✓ Lance registrado com sucesso!
        </motion.p>
      )}
    </div>
  )
}

