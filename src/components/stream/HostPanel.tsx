'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency } from '@/lib/utils'
import type { Stream } from '@/types'

type Tab = 'pin' | 'poll' | 'flash' | 'live'

const field = 'w-full h-9 px-3 rounded-md bg-white/10 text-white text-sm placeholder:text-white/40 outline-none focus:bg-white/15'

interface HostPanelProps {
  stream: Stream
  pinnedId: string | null
  hasPoll: boolean
  hasFlashSale: boolean
  onClose?: () => void
}

// Live tools for the stream's host. Changes reach viewers through the live room.
export function HostPanel({ stream, pinnedId, hasPoll, hasFlashSale, onClose }: HostPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pin')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [pollMinutes, setPollMinutes] = useState('5')

  // Suggests 10 units, or the whole stock if there's less
  const suggestedQuantity = (productId: string) => String(Math.min(10, stream.products.find(p => p.id === productId)?.stock ?? 10))
  const firstProductId = stream.products[0]?.id ?? ''
  const [flash, setFlash] = useState({
    productId: firstProductId,
    discountPercent: '20',
    durationMinutes: '10',
    quantity: suggestedQuantity(firstProductId),
  })

  const call = async (path: string, method: string, body?: object, okText = 'Pronto!') => {
    setBusy(true)
    setMessage(null)
    const res = await fetch(`/api/seller/streams/${stream.id}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null
      setMessage({ ok: false, text: data?.message ?? 'Não foi possível fazer isso agora.' })
      return false
    }
    setMessage({ ok: true, text: okText })
    return true
  }

  const startPoll = async () => {
    const filled = options.map(o => o.trim()).filter(Boolean)
    if (await call('/poll', 'POST', { question, options: filled, durationMinutes: pollMinutes || undefined }, 'Enquete no ar!')) {
      setQuestion('')
      setOptions(['', ''])
    }
  }

  const setStatus = async (status: 'live' | 'ended') => {
    if (status === 'ended' && !confirm('Encerrar a live para todos?')) return
    if (await call('', 'PATCH', { status }, status === 'live' ? 'Você está ao vivo!' : 'Live encerrada')) router.refresh()
  }

  return (
    <div className="rounded-xl bg-black/80 backdrop-blur p-3 text-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sunset-gold text-xs font-bold uppercase">Ferramentas do apresentador</span>
        {onClose && (
          <button onClick={onClose} aria-label="Fechar" className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-3">
        {(
          [
            ['pin', 'Produto'],
            ['poll', 'Enquete'],
            ['flash', 'Oferta'],
            ['live', 'Live'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id)
              setMessage(null)
            }}
            className={cn('flex-1 py-1 rounded text-xs font-medium', tab === id ? 'bg-white text-gray-900' : 'bg-white/10 text-white/70')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pin' && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {stream.products.length === 0 && <p className="text-white/50 text-sm">Esta live não tem produtos.</p>}
          {stream.products.map(p => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => call('/pin', 'PUT', { productId: pinnedId === p.id ? null : p.id }, pinnedId === p.id ? 'Produto desafixado' : 'Mostrando agora')}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left text-sm',
                pinnedId === p.id ? 'bg-coral-pink/30' : 'hover:bg-white/10'
              )}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-white/60 text-xs">{pinnedId === p.id ? 'Desafixar' : formatCurrency(p.price)}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'poll' && (
        <div className="space-y-2">
          <input className={field} placeholder="Pergunta" maxLength={140} value={question} onChange={e => setQuestion(e.target.value)} />
          {options.map((o, i) => (
            <input
              key={i}
              className={field}
              placeholder={`Opção ${i + 1}`}
              maxLength={60}
              value={o}
              onChange={e => setOptions(list => list.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <div className="flex items-center gap-2">
            {options.length < 4 && (
              <button onClick={() => setOptions(list => [...list, ''])} className="text-xs text-sky-blue hover:underline">
                + opção
              </button>
            )}
            <label className="ml-auto flex items-center gap-1 text-xs text-white/60">
              Duração (min)
              <input className={cn(field, 'w-14 h-7')} inputMode="numeric" value={pollMinutes} onChange={e => setPollMinutes(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" fullWidth isLoading={busy} onClick={startPoll}>
              {hasPoll ? 'Trocar enquete' : 'Lançar enquete'}
            </Button>
            {hasPoll && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => call('/poll', 'DELETE', undefined, 'Enquete encerrada')}>
                Encerrar
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'flash' && (
        <div className="space-y-2">
          <select className={field} value={flash.productId} onChange={e => setFlash(f => ({ ...f, productId: e.target.value, quantity: suggestedQuantity(e.target.value) }))}>
            {stream.products.map(p => (
              <option key={p.id} value={p.id} className="text-gray-900">
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['discountPercent', '% off'],
                ['durationMinutes', 'Minutos'],
                ['quantity', 'Unidades'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-white/60">
                {label}
                <input
                  className={cn(field, 'mt-0.5')}
                  inputMode="numeric"
                  value={flash[key]}
                  onChange={e => setFlash(f => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" fullWidth isLoading={busy} disabled={!flash.productId} onClick={() => call('/flash-sale', 'POST', flash, 'Oferta relâmpago no ar!')}>
              {hasFlashSale ? 'Trocar oferta' : 'Lançar oferta'}
            </Button>
            {hasFlashSale && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => call('/flash-sale', 'DELETE', undefined, 'Oferta encerrada')}>
                Encerrar
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-2">
          <p className="text-white/60 text-sm">
            {stream.isLive
              ? 'Você está ao vivo. Use os botões ao lado do vídeo para microfone e câmera.'
              : 'A live ainda não começou. Ao iniciar, sua câmera e microfone são ligados e seus seguidores são avisados.'}
          </p>
          {stream.isLive ? (
            <Button size="sm" variant="secondary" fullWidth isLoading={busy} onClick={() => setStatus('ended')}>
              Encerrar live
            </Button>
          ) : (
            <Button size="sm" fullWidth isLoading={busy} onClick={() => setStatus('live')}>
              Iniciar live
            </Button>
          )}
        </div>
      )}

      {message && <p className={cn('mt-2 text-xs', message.ok ? 'text-tropical-green' : 'text-coral-pink')}>{message.text}</p>}
    </div>
  )
}
