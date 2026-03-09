'use client'

import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Search, X } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'ghost'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    const variants = {
      default: `
        bg-gray-50 border border-gray-200 text-gray-900
        placeholder:text-gray-400
        focus:border-primary focus:ring-2 focus:ring-primary/20
      `,
      filled: `
        bg-gray-100 border border-transparent text-gray-900
        placeholder:text-gray-400
        focus:border-primary focus:ring-2 focus:ring-primary/20
      `,
      ghost: `
        bg-transparent border-b border-gray-200 text-gray-900 rounded-none
        placeholder:text-gray-400
        focus:border-primary
      `,
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              'w-full h-12 rounded-lg outline-none transition-all duration-200',
              variants[variant],
              leftIcon ? 'pl-10' : 'px-4',
              rightIcon || isPassword ? 'pr-10' : 'px-4',
              error && 'border-coral-pink focus:border-coral-pink focus:ring-coral-pink/20',
              className
            )}
            ref={ref}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-coral-pink">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-sm text-gray-400">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search input variant
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onClear?: () => void
  showClear?: boolean
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, showClear = true, value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-5 w-5" />}
        rightIcon={
          showClear && hasValue ? (
            <button
              type="button"
              onClick={onClear}
              className="hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          ) : undefined
        }
        value={value}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export { Input, SearchInput }

