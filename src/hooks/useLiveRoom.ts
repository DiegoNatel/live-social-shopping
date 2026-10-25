'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types'
import type { ClientMessage, ReactionEmoji, ServerMessage } from '@/realtime/protocol'

export type RoomStatus = 'connecting' | 'open' | 'offline'

const MAX_MESSAGES = 100

// Connects to a live room (LiveRoom Durable Object) and keeps the chat, viewer count and
// connection state. Every other event (bids, polls, ...) goes to onEvent.
// Reconnects with backoff; a fresh ticket is fetched each time (they expire after 5 minutes).
export function useLiveRoom(streamId: string, onEvent: (msg: ServerMessage) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [viewers, setViewers] = useState<number | null>(null)
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const [canChat, setCanChat] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    // No stream (e.g. "not found" page): nothing to join
    if (!streamId) return
    let closed = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = async () => {
      setStatus(s => (s === 'open' ? s : 'connecting'))
      const ticket = await fetch(`/api/live/${encodeURIComponent(streamId)}/ticket`, { cache: 'no-store' })
        .then(r => (r.ok ? (r.json() as Promise<{ ticket: string | null }>) : { ticket: null }))
        .then(d => d.ticket)
        .catch(() => null)
      if (closed) return

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${proto}//${window.location.host}/api/live/${encodeURIComponent(streamId)}/ws${ticket ? `?ticket=${encodeURIComponent(ticket)}` : ''}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        attempt = 0
        setStatus('open')
        setError('')
      }
      ws.onmessage = e => {
        let msg: ServerMessage
        try {
          msg = JSON.parse(e.data)
        } catch {
          return
        }
        switch (msg.t) {
          case 'hello':
            setMessages(msg.messages)
            setViewers(msg.viewers)
            setCanChat(msg.canChat)
            setIsHost(msg.isHost)
            break
          case 'chat':
            setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), msg.message])
            break
          case 'deleted':
            setMessages(prev => prev.filter(m => m.id !== msg.id))
            break
          case 'viewers':
            setViewers(msg.count)
            break
          case 'error':
            setError(msg.message)
            break
          default:
            onEventRef.current(msg)
        }
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (closed) return
        setStatus('offline')
        // 1s, 2s, 4s ... up to 30s
        retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt++))
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retryTimer)
      wsRef.current?.close()
    }
  }, [streamId])

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current
    if (ws?.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(msg))
    return true
  }, [])

  return {
    messages,
    viewers,
    status,
    canChat,
    isHost,
    error,
    clearError: () => setError(''),
    sendChat: (text: string) => send({ t: 'chat', text }),
    sendReaction: (emoji: ReactionEmoji) => send({ t: 'react', emoji }),
    deleteMessage: (id: string) => send({ t: 'delete', id }),
  }
}
