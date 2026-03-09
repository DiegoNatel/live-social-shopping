'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useNotificationStore } from '@/store'
import { formatRelativeTime, cn } from '@/lib/utils'
import {
  Bell,
  BellOff,
  Radio,
  Package,
  Gift,
  Tag,
  Users,
  Check,
  Trash2,
} from 'lucide-react'

// Notification animation
const notificationVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  }),
  exit: {
    opacity: 0,
    x: -100,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore()

  const getIcon = (type: string) => {
    switch (type) {
      case 'stream_live':
        return <Radio className="w-5 h-5 text-coral-pink" />
      case 'order_update':
        return <Package className="w-5 h-5 text-blue-500" />
      case 'promotion':
        return <Tag className="w-5 h-5 text-amber-500" />
      case 'follow':
        return <Users className="w-5 h-5 text-purple-500" />
      case 'message':
        return <Gift className="w-5 h-5 text-tropical-green" />
      default:
        return <Bell className="w-5 h-5 text-gray-400" />
    }
  }

  if (notifications.length === 0) {
    return (
      <MainLayout headerProps={{ title: 'Notificações', showNotifications: false }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <BellOff className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-gray-900 text-xl font-semibold mb-2">
            Nenhuma notificação
          </h2>
          <p className="text-gray-500">
            Você está em dia! Volte mais tarde.
          </p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout headerProps={{ title: 'Notificações', showNotifications: false }}>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm">
            {notifications.filter(n => !n.isRead).length} não lidas
          </span>
          <div className="flex gap-2">
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar todas
            </button>
            <button 
              onClick={clearNotifications}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                custom={index}
                variants={notificationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <Link
                  href={notification.actionUrl || '#'}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:shadow-md',
                      notification.isRead 
                        ? 'bg-white border border-gray-100' 
                        : 'bg-primary/5 border border-primary/20 shadow-sm'
                    )}
                  >
                    {/* Icon or Image */}
                    {notification.image ? (
                      <Avatar src={notification.image} alt="" size="md" />
                    ) : (
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        notification.isRead ? 'bg-gray-100' : 'bg-white shadow-sm'
                      )}>
                        {getIcon(notification.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        'font-semibold mb-0.5',
                        notification.isRead ? 'text-gray-700' : 'text-gray-900'
                      )}>
                        {notification.title}
                      </h4>
                      <p className={cn(
                        'text-sm line-clamp-2',
                        notification.isRead ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {notification.message}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <motion.div 
                        className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  )
}

