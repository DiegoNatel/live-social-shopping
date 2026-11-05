'use client'

import { useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { useUserStore } from '@/store'
import { cn, loginHrefHere } from '@/lib/utils'

interface ReminderButtonProps {
  streamId: string
  // 'small' on cards, 'large' over a scheduled live's video
  size?: 'small' | 'large'
  // How to ask a guest to log in (the live page has its own prompt); otherwise goes to /login
  onAskLogin?: () => void
  className?: string
}

// "Lembrar-me": when the live starts, a notification and an e-mail (see setStreamStatus in lib/seller.ts)
export function ReminderButton({ streamId, size = 'small', onAskLogin, className }: ReminderButtonProps) {
  const isAuthenticated = useUserStore(s => s.isAuthenticated)
  const on = useUserStore(s => s.reminderStreamIds.includes(streamId))
  const toggleReminder = useUserStore(s => s.toggleReminder)
  const [failed, setFailed] = useState(false)

  const click = async (e: React.MouseEvent) => {
    // Cards are links to the live: the button shouldn't open it
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      if (onAskLogin) onAskLogin()
      else window.location.href = loginHrefHere()
      return
    }
    setFailed(!(await toggleReminder(streamId)))
  }

  const Icon = on ? BellRing : Bell
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      title={on ? 'Você vai receber um aviso quando a live começar' : 'Receber um aviso quando a live começar'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors',
        size === 'small' ? 'h-8 px-3 text-xs' : 'h-11 px-5 text-sm',
        on
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : size === 'small'
            ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            : 'bg-primary text-white hover:bg-primary-600',
        className
      )}
    >
      <Icon className={size === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {failed ? 'Tente de novo' : on ? 'Lembrete ativado' : 'Lembrar-me'}
    </button>
  )
}
