import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, CartItem, Product, Notification } from '@/types'

// Cart Store
interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variants?: Record<string, string>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1, variants) => {
        const items = get().items
        const existingItem = items.find(item => 
          item.product.id === product.id && 
          JSON.stringify(item.selectedVariants) === JSON.stringify(variants)
        )
        
        if (existingItem) {
          set({
            items: items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                id: `cart-${Date.now()}`,
                product,
                quantity,
                selectedVariants: variants,
              },
            ],
          })
        }
      },
      
      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.product.id !== productId),
        })
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        })
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        )
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'vivobuy-cart',
    }
  )
)

// User Store — mirrors the server session (filled by SessionSync from /api/me)
interface UserState {
  user: User | null
  isAuthenticated: boolean
  interests: string[]
  setSession: (session: { user: User; interests: string[]; followedHosts: string[] } | null) => void
  setInterests: (interests: string[]) => void
  followedHosts: string[]
  followHost: (hostId: string) => void
  unfollowHost: (hostId: string) => void
  isFollowing: (hostId: string) => boolean
}

async function saveFollow(hostId: string, follow: boolean) {
  const res = await fetch('/api/follows', {
    method: follow ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostId }),
  })
  if (!res.ok) throw new Error(`follow failed: ${res.status}`)
}

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  interests: [],
  followedHosts: [],

  setSession: (session) =>
    set(
      session
        ? { user: session.user, isAuthenticated: true, interests: session.interests, followedHosts: session.followedHosts }
        : { user: null, isAuthenticated: false, interests: [], followedHosts: [] }
    ),
  setInterests: (interests) => set({ interests }),

  // Optimistic update, rolled back if the request fails
  followHost: (hostId) => {
    if (!get().isAuthenticated || get().followedHosts.includes(hostId)) return
    set({ followedHosts: [...get().followedHosts, hostId] })
    saveFollow(hostId, true).catch(() =>
      set({ followedHosts: get().followedHosts.filter(id => id !== hostId) })
    )
  },

  unfollowHost: (hostId) => {
    if (!get().followedHosts.includes(hostId)) return
    set({ followedHosts: get().followedHosts.filter(id => id !== hostId) })
    saveFollow(hostId, false).catch(() => set({ followedHosts: [...get().followedHosts, hostId] }))
  },

  isFollowing: (hostId) => get().followedHosts.includes(hostId),
}))

// Notifications Store
interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: 'notif-1',
          type: 'stream_live',
          title: 'Ana Carolina está ao vivo!',
          message: 'Mega queima de vestidos com até 60% OFF',
          timestamp: new Date(),
          isRead: false,
          actionUrl: '/live/stream-1',
          image: 'https://i.pravatar.cc/150?img=1',
        },
        {
          id: 'notif-2',
          type: 'promotion',
          title: '🔥 Oferta Relâmpago!',
          message: 'PIX com 5% de desconto por tempo limitado',
          timestamp: new Date(Date.now() - 3600000),
          isRead: false,
        },
      ],
      unreadCount: 2,
      
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}`,
          timestamp: new Date(),
          isRead: false,
        }
        set({
          notifications: [newNotification, ...get().notifications],
          unreadCount: get().unreadCount + 1,
        })
      },
      
      markAsRead: (notificationId) => {
        const notifications = get().notifications
        const notification = notifications.find(n => n.id === notificationId)
        if (notification && !notification.isRead) {
          set({
            notifications: notifications.map(n =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, get().unreadCount - 1),
          })
        }
      },
      
      markAllAsRead: () => {
        set({
          notifications: get().notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        })
      },
      
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'vivobuy-notifications',
    }
  )
)

// UI Store
interface UIState {
  isCartOpen: boolean
  isProductModalOpen: boolean
  selectedProduct: Product | null
  isCheckoutOpen: boolean
  isChatExpanded: boolean
  activeTab: 'home' | 'discover' | 'cart' | 'profile'
  
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  
  openProductModal: (product: Product) => void
  closeProductModal: () => void
  
  openCheckout: () => void
  closeCheckout: () => void
  
  toggleChat: () => void
  setActiveTab: (tab: 'home' | 'discover' | 'cart' | 'profile') => void
}

export const useUIStore = create<UIState>()((set) => ({
  isCartOpen: false,
  isProductModalOpen: false,
  selectedProduct: null,
  isCheckoutOpen: false,
  isChatExpanded: false,
  activeTab: 'home',
  
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  
  openProductModal: (product) => set({ isProductModalOpen: true, selectedProduct: product }),
  closeProductModal: () => set({ isProductModalOpen: false, selectedProduct: null }),
  
  openCheckout: () => set({ isCheckoutOpen: true, isCartOpen: false }),
  closeCheckout: () => set({ isCheckoutOpen: false }),
  
  toggleChat: () => set((state) => ({ isChatExpanded: !state.isChatExpanded })),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))

