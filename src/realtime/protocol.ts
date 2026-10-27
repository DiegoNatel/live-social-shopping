// Messages exchanged over a live room's WebSocket (/api/live/<streamId>/ws).
// Shared by the browser (hooks/useLiveRoom), the LiveRoom Durable Object and the Next API routes.
import type { Auction, AuctionBid, ChatMessage, FlashSale, Poll, User } from '@/types'

export const REACTION_EMOJIS = ['❤️', '🔥', '😍', '👏', '🎉', '💯'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export const CHAT_MAX_LENGTH = 300

// Browser → room
export type ClientMessage =
  | { t: 'chat'; text: string }
  | { t: 'react'; emoji: ReactionEmoji }
  // Host only
  | { t: 'delete'; id: string }

// Room → browser
export type ServerMessage =
  | { t: 'hello'; viewers: number; messages: ChatMessage[]; canChat: boolean; isHost: boolean }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'deleted'; id: string }
  | { t: 'react'; emoji: ReactionEmoji }
  | { t: 'viewers'; count: number }
  | { t: 'bid'; auctionId: string; currentBid: number; endTime: string; bid: AuctionBid }
  | { t: 'auction'; auction: Auction }
  | { t: 'auction_end'; auctionId: string; winner: User | null; amount: number }
  | { t: 'poll'; poll: Poll | null }
  | { t: 'flash'; flashSale: FlashSale | null }
  | { t: 'pin'; productId: string | null }
  // The live's product list changed (a guest seller added or removed products)
  | { t: 'products' }
  | { t: 'status'; status: 'live' | 'ended' }
  | { t: 'error'; message: string }

// Next API routes → room (internal, through the LIVE_ROOM binding only)
export interface RoomCommand {
  broadcast?: ServerMessage
  // Close this auction (pick the winner) when it ends
  scheduleAuction?: { id: string; endsAt: string }
}

// Auctions outside a stream still need a room to close them
export const roomName = (streamId: string | null | undefined, auctionId?: string) =>
  streamId ?? `auction:${auctionId}`
