import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, CartItem, Product, Notification } from '@/types'
import { availableStock, unitPrice, type AppliedCoupon } from '@/lib/pricing'

// Cart Store
interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variants?: Record<string, string>) => void
  // Both take the cart line id: the same product can be in the cart with different variants
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  // Replaces the saved product copies with current data; returns true if anything changed
  refreshProducts: () => Promise<boolean>
  getTotal: () => number
  getItemCount: () => number
  // Validated by /api/coupons/check; the order API re-checks it
  appliedCoupon: AppliedCoupon | null
  setCoupon: (coupon: AppliedCoupon | null) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      setCoupon: (coupon) => set({ appliedCoupon: coupon }),
      
      addItem: (product, quantity = 1, variants) => {
        const items = get().items
        const existingItem = items.find(item => 
          item.product.id === product.id && 
          JSON.stringify(item.selectedVariants) === JSON.stringify(variants)
        )
        
        const max = availableStock(product, variants)
        if (existingItem) {
          set({
            items: items.map(item =>
              item.id === existingItem.id
                ? { ...item, quantity: Math.min(max, item.quantity + quantity) }
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
                quantity: Math.min(max, quantity),
                selectedVariants: variants,
              },
            ],
          })
        }
      },
      
      removeItem: (lineId) => {
        set({
          items: get().items.filter(item => item.id !== lineId),
        })
      },
      
      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId)
          return
        }
        set({
          items: get().items.map(item =>
            item.id === lineId
              ? { ...item, quantity: Math.min(availableStock(item.product, item.selectedVariants), quantity) }
              : item
          ),
        })
      },
      
      clearCart: () => set({ items: [], appliedCoupon: null }),

      refreshProducts: async () => {
        const items = get().items
        if (items.length === 0) return false
        const res = await fetch('/api/cart/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [...new Set(items.map(i => i.product.id))] }),
        }).catch(() => null)
        if (!res?.ok) return false
        const fresh = new Map((await res.json() as Product[]).map(p => [p.id, p]))

        // Drop products that are gone or sold out, and clamp quantities to what's left
        const next = items.flatMap(item => {
          const product = fresh.get(item.product.id)
          if (!product) return []
          const quantity = Math.min(item.quantity, availableStock(product, item.selectedVariants))
          return quantity > 0 ? [{ ...item, product, quantity }] : []
        })
        const changed =
          next.length !== items.length ||
          next.some((item, i) =>
            item.quantity !== items[i].quantity ||
            unitPrice(item.product, item.selectedVariants) !== unitPrice(items[i].product, items[i].selectedVariants)
          )
        set({ items: next })
        return changed
      },
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + unitPrice(item.product, item.selectedVariants) * item.quantity,
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
  setSession: (
    session: { user: User; interests: string[]; followedHosts: string[]; favoriteIds: string[] } | null
  ) => void
  setInterests: (interests: string[]) => void
  followedHosts: string[]
  followHost: (hostId: string) => void
  unfollowHost: (hostId: string) => void
  isFollowing: (hostId: string) => boolean
  favoriteIds: string[]
  toggleFavorite: (productId: string) => void
}

async function send(url: string, method: 'POST' | 'DELETE', body: object) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
}

const saveFollow = (hostId: string, follow: boolean) => send('/api/follows', follow ? 'POST' : 'DELETE', { hostId })

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  interests: [],
  followedHosts: [],
  favoriteIds: [],

  setSession: (session) =>
    set(
      session
        ? {
            user: session.user,
            isAuthenticated: true,
            interests: session.interests,
            followedHosts: session.followedHosts,
            favoriteIds: session.favoriteIds,
          }
        : { user: null, isAuthenticated: false, interests: [], followedHosts: [], favoriteIds: [] }
    ),

  // Optimistic, rolled back if the request fails
  toggleFavorite: (productId) => {
    if (!get().isAuthenticated) return
    const isFav = get().favoriteIds.includes(productId)
    const without = () => get().favoriteIds.filter(id => id !== productId)
    set({ favoriteIds: isFav ? without() : [...get().favoriteIds, productId] })
    send('/api/favorites', isFav ? 'DELETE' : 'POST', { productId }).catch(() =>
      set({ favoriteIds: isFav ? [...get().favoriteIds, productId] : without() })
    )
  },
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

// Notifications Store — server-backed (/api/notifications); loaded by SessionSync
interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  load: () => Promise<void>
  reset: () => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

const sendNotifications = (method: 'PATCH' | 'DELETE', body?: object) =>
  fetch('/api/notifications', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,

  load: async () => {
    const res = await fetch('/api/notifications', { cache: 'no-store' })
    if (!res.ok) return
    const notifications: Notification[] = await res.json()
    set({ notifications, unreadCount: notifications.filter(n => !n.isRead).length })
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),

  markAsRead: (notificationId) => {
    const notifications = get().notifications
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.isRead) {
      set({
        notifications: notifications.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, get().unreadCount - 1),
      })
      sendNotifications('PATCH', { id: notificationId })
    }
  },

  markAllAsRead: () => {
    set({ notifications: get().notifications.map(n => ({ ...n, isRead: true })), unreadCount: 0 })
    sendNotifications('PATCH', {})
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 })
    sendNotifications('DELETE')
  },
}))

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

