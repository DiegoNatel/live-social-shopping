// User Types
export interface User {
  id: string
  name: string
  username: string
  avatar: string
  isVerified: boolean
  followers: number
  following: number
  bio?: string
}

// Product Types
export type ItemType = 'product' | 'course'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  variants?: ProductVariant[]
  stock: number
  rating: number
  reviews: number
  seller: User
  tags?: string[]
  itemType?: ItemType // 'product' by default
  isActive?: boolean // false when the seller paused it (only in the seller's own lists)
  // Set while a flash sale is running; price is already the sale price
  flashSale?: { id: string; discountPercent: number; endsAt: string; remaining: number; regularPrice: number }
}

export interface ProductVariant {
  id: string
  type: 'size' | 'color'
  name: string
  value: string
  stock: number
  priceModifier?: number
}

// Course Types
export interface Course {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  thumbnail: string
  category: string
  instructor: User
  rating: number
  reviews: number
  tags?: string[]
  itemType: 'course'
  // Course-specific fields
  duration: string // e.g., "12h 30min"
  lessonsCount: number
  studentsCount: number
  level: 'beginner' | 'intermediate' | 'advanced'
  language: string
  lastUpdated: Date | string
  modules: CourseModule[]
  certificateIncluded: boolean
}

export interface CourseModule {
  id: string
  title: string
  duration: string
  lessonsCount: number
  lessons: CourseLesson[]
}

export interface CourseLesson {
  id: string
  title: string
  duration: string
  isFree: boolean
  type: 'video' | 'quiz' | 'exercise' | 'download'
}

// Union type for items (products or courses)
export type ShopItem = Product | Course

// Type guard to check if item is a course
export function isCourse(item: ShopItem): item is Course {
  return item.itemType === 'course'
}

// Stream Types
export interface Stream {
  id: string
  title: string
  description: string
  host: User
  thumbnail: string
  videoUrl?: string
  isLive: boolean
  viewerCount: number
  startTime: Date | string
  scheduledTime?: Date | string
  category: string
  products: Product[]
  tags: string[]
  likes: number
  pinnedProductId?: string // product the host is showing now
}

// Cart Types
export interface CartItem {
  id: string
  product: Product
  quantity: number
  selectedVariants?: Record<string, string>
}

// Chat Types
export interface ChatMessage {
  id: string
  user: User
  message: string
  timestamp: Date | string
  type: 'text' | 'question' | 'purchase' | 'system'
  isPinned?: boolean
  product?: Product
}

// Reaction Types
export type ReactionType = 'heart' | 'fire' | 'star' | 'clap' | 'wow'

export interface Reaction {
  id: string
  type: ReactionType
  userId: string
  timestamp: Date | string
}

// Order Types
export interface Order {
  id: string
  items: CartItem[]
  total: number
  subtotal: number
  shipping: number
  discount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  createdAt: Date | string
  shippingAddress: Address
  trackingCode?: string
}

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'wallet'
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// Address Types
export interface Address {
  id: string
  name: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  phone: string
  isDefault?: boolean
}

// Category Types
export interface Category {
  id: string
  name: string
  icon: string
  slug: string
  color: string
}

// Notification Types
export interface Notification {
  id: string
  type: 'stream_live' | 'order_update' | 'promotion' | 'follow' | 'message'
  title: string
  message: string
  timestamp: Date | string
  isRead: boolean
  actionUrl?: string
  image?: string
}

// Gamification Types
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date | string
}

export interface LoyaltyTier {
  id: string
  name: string
  minPoints: number
  benefits: string[]
  color: string
}

export interface UserStats {
  totalPurchases: number
  totalSpent: number
  watchTime: number
  points: number
  tier: LoyaltyTier
  badges: Badge[]
  streak: number
}

// Poll Types
export interface Poll {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  endsAt?: Date | string
  isActive: boolean
}

export interface PollOption {
  id: string
  text: string
  votes: number
  percentage: number
}

// Flash Sale Types
export interface FlashSale {
  id: string
  product: Product
  discountPercentage: number
  startTime: Date | string
  endTime: Date | string
  quantityAvailable: number
  quantitySold: number
}

// Auction Types
export interface Auction {
  id: string
  product: Product
  startingPrice: number
  currentBid: number
  minimumIncrement: number
  startTime: Date | string
  endTime: Date | string
  bids: AuctionBid[]
  status: 'upcoming' | 'active' | 'ended'
  winnerId?: string
  streamId?: string // If auction is part of a live stream
}

export interface AuctionBid {
  id: string
  auctionId: string
  user: User
  amount: number
  timestamp: Date | string
}

