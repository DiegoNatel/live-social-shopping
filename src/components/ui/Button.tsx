'use client'

import { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: `
        bg-gradient-to-r from-primary to-primary-400 
        text-white font-semibold shadow-btn-primary
        hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
      `,
      secondary: `
        border-2 border-primary text-primary 
        bg-transparent hover:bg-primary/10
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      ghost: `
        text-gray-600 bg-transparent 
        hover:bg-gray-100 active:bg-gray-200
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      danger: `
        bg-coral-pink text-white font-semibold
        hover:bg-coral-pink-600 
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      success: `
        bg-tropical-green text-white font-semibold
        hover:bg-tropical-green-600
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-5 py-2.5 text-base rounded-xl',
      lg: 'px-6 py-3 text-lg rounded-xl',
      icon: 'w-10 h-10 rounded-full p-0 flex items-center justify-center',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

