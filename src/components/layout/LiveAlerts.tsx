'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Radio, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useNotificationStore, useUserStore } from '@/store'
import type { Notification } from '@/types'

const CHECK_EVERY_MS = 30_000
const SHOW_FOR_MS = 12_000

// Pops up "X está ao vivo!" when a live the user follows, or that matches their interests,
// starts while they're on the site (from the stream_live notifications sent when it starts)
export function LiveAlerts() {
  const pathname = usePathname()
  const { isAuthenticated } = useUserStore()
  const { notifications, load } = useNotificationStore()
  const [alert, setAlert] = useState<Notification | null>(null)
  const shown = useRef(new Set<string>())
  // Only lives that start after the page opened; older ones are in the notifications page
  const openedAt = useRef(Date.now())

  useEffect(() => {
    if (!isAuthenticated) return
    const check = () => document.visibilityState === 'visible' && load()
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [isAuthenticated, load])

  useEffect(() => {
    const fresh = notifications.find(
      n =>
        n.type === 'stream_live' &&
        !n.isRead &&
        !shown.current.has(n.id) &&
        new Date(n.timestamp).getTime() > openedAt.current - 60_000 &&
        n.actionUrl !== pathname
    )
    if (!fresh) return
    shown.current.add(fresh.id)
    setAlert(fresh)
  }, [notifications, pathname])

  useEffect(() => {
    if (!alert) return
    const timer = setTimeout(() => setAlert(null), SHOW_FOR_MS)
    return () => clearTimeout(timer)
  }, [alert])

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-[60] bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-center gap-3"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          role="status"
        >
          {alert.image ? (
            <Avatar src={alert.image} alt="" size="md" isLive />
          ) : (
            <div className="w-10 h-10 rounded-full bg-coral-pink/10 text-coral-pink flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-sm font-semibold truncate">{alert.title}</p>
            <p className="text-gray-500 text-xs truncate">{alert.message}</p>
          </div>
          {alert.actionUrl && (
            <Link
              href={alert.actionUrl}
              onClick={() => setAlert(null)}
              className="bg-coral-pink text-white text-sm font-medium rounded-full px-3 h-8 leading-8 whitespace-nowrap"
            >
              Assistir
            </Link>
          )}
          <button onClick={() => setAlert(null)} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
