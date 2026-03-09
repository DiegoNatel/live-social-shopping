import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, CartItem, Product, Notification } from '@/types'
import { currentUser } from '@/data/mock-data'

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

// User Store
interface UserState {
  user: User | null
  isAuthenticated: boolean
  interests: string[]
  login: (user: User) => void
  logout: () => void
  setInterests: (interests: string[]) => void
  followedHosts: string[]
  followHost: (hostId: string) => void
  unfollowHost: (hostId: string) => void
  isFollowing: (hostId: string) => boolean
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: currentUser,
      isAuthenticated: true,
      interests: [],
      
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, interests: [] }),
      setInterests: (interests) => set({ interests }),
      
      followedHosts: ['user-1', 'user-2'],
      
      followHost: (hostId) => {
        if (!get().followedHosts.includes(hostId)) {
          set({ followedHosts: [...get().followedHosts, hostId] })
        }
      },
      
      unfollowHost: (hostId) => {
        set({
          followedHosts: get().followedHosts.filter(id => id !== hostId),
        })
      },
      
      isFollowing: (hostId) => get().followedHosts.includes(hostId),
    }),
    {
      name: 'vivobuy-user',
    }
  )
)

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

