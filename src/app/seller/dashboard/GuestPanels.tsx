'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Gavel, Package, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'
import type { GuestInvite, StreamGuest } from '@/lib/guests'

const SPLIT_NOTE = 'Vendas dos seus produtos nesta live são divididas 50/50 com o anfitrião.'

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (res.ok) return null
  const data = (await res.json().catch(() => null)) as { message?: string } | null
  return data?.message ?? 'Não foi possível concluir. Tente de novo.'
}

// ---------- Guest side: invitations this seller received ----------

export function GuestInvites({
  invites,
  products,
  onCreateAuction,
}: {
  invites: GuestInvite[]
  products: Product[]
  onCreateAuction: (streamId: string) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (invites.length === 0) return null

  const respond = async (streamId: string, accept: boolean) => {
    setBusy(streamId)
    setError((await send(`/api/seller/streams/${streamId}/guests`, 'PATCH', { accept })) ?? '')
    setBusy(null)
    router.refresh()
  }

  return (
    <div className="mb-6">
      <p className="text-gray-500 mb-3">Convites para lives</p>
      {error && <p className="text-coral-pink text-sm mb-3">{error}</p>}
      <div className="space-y-3">
        {invites.map(invite => (
          <div key={invite.streamId} className="rounded-xl bg-white shadow-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-gray-900 font-medium line-clamp-1">{invite.title}</p>
                <p className="text-gray-500 text-sm">
                  Anfitrião: {invite.host.name} (@{invite.host.username})
                  {invite.streamStatus === 'live' && <span className="text-coral-pink font-medium"> · ao vivo agora</span>}
                </p>
              </div>
              {invite.status === 'accepted' && (
                <span className="flex items-center gap-1 text-tropical-green text-sm font-medium shrink-0">
                  <Check className="w-4 h-4" /> Aceito
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-2">{SPLIT_NOTE}</p>

            {invite.status === 'invited' ? (
              <div className="flex justify-end gap-2 mt-3">
                <Button size="sm" variant="secondary" disabled={busy === invite.streamId} onClick={() => respond(invite.streamId, false)}>
                  Recusar
                </Button>
                <Button size="sm" isLoading={busy === invite.streamId} onClick={() => respond(invite.streamId, true)}>
                  Aceitar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2 mt-3">
                <Link href={`/live/${invite.streamId}`}>
                  <Button size="sm" variant="ghost">Ver live</Button>
                </Link>
                <Button size="sm" variant="secondary" leftIcon={<Gavel className="w-4 h-4" />} onClick={() => onCreateAuction(invite.streamId)}>
                  Criar leilão
                </Button>
                <Button size="sm" leftIcon={<Package className="w-4 h-4" />} onClick={() => setPicking(invite.streamId)}>
                  Adicionar produtos
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {picking && (
        <ProductPicker
          streamId={picking}
          products={products.filter(p => p.isActive !== false)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}

function ProductPicker({ streamId, products, onClose }: { streamId: string; products: Product[]; onClose: () => void }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id].slice(0, 20)))

  const save = async () => {
    setSaving(true)
    const message = await send(`/api/seller/streams/${streamId}/products`, 'POST', { productIds: selected })
    setSaving(false)
    if (message) return setError(message)
    router.refresh()
    onClose()
  }

  return (
    <Dialog title="Adicionar produtos à live" onClose={onClose}>
      {products.length === 0 && <p className="text-gray-500 text-sm">Você ainda não tem produtos ativos.</p>}
      <div className="max-h-72 overflow-y-auto space-y-1 mb-4">
        {products.map(p => (
          <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="accent-coral-pink" />
            <span className="text-gray-800 text-sm line-clamp-1">{p.name}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-coral-pink text-sm mb-3">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button size="sm" isLoading={saving} disabled={selected.length === 0} onClick={save}>
          Adicionar {selected.length > 0 && `(${selected.length})`}
        </Button>
      </div>
    </Dialog>
  )
}

// ---------- Host side: guest sellers of one of the host's lives ----------

export function StreamGuestsButton({ streamId }: { streamId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setOpen(true)}>
        Convidados
      </Button>
      {open && <StreamGuests streamId={streamId} onClose={() => setOpen(false)} />}
    </>
  )
}

function StreamGuests({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const router = useRouter()
  const [guests, setGuests] = useState<StreamGuest[] | null>(null)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    () =>
      fetch(`/api/seller/streams/${streamId}/guests`)
        .then(r => (r.ok ? (r.json() as Promise<StreamGuest[]>) : []))
        .then(setGuests)
        .catch(() => setGuests([])),
    [streamId]
  )
  useEffect(() => {
    load()
  }, [load])

  const invite = async () => {
    if (!username.trim()) return
    setBusy(true)
    const message = await send(`/api/seller/streams/${streamId}/guests`, 'POST', { username: username.trim() })
    setError(message ?? '')
    if (!message) setUsername('')
    await load()
    setBusy(false)
  }

  const remove = async (sellerId: string) => {
    setBusy(true)
    setError((await send(`/api/seller/streams/${streamId}/guests`, 'DELETE', { sellerId })) ?? '')
    await load()
    setBusy(false)
    router.refresh()
  }

  return (
    <Dialog title="Vendedores convidados" onClose={onClose}>
      <p className="text-gray-500 text-sm mb-3">
        Convidados aceitos podem adicionar os próprios produtos e leilões a esta live. Você recebe 50% das vendas deles feitas
        durante a live.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          className={cn(inputClass, 'flex-1')}
          placeholder="@usuario do vendedor"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && invite()}
        />
        <Button size="sm" isLoading={busy} onClick={invite}>Convidar</Button>
      </div>
      {error && <p className="text-coral-pink text-sm mb-3">{error}</p>}
      <div className="space-y-2">
        {guests?.length === 0 && <p className="text-gray-400 text-sm">Nenhum convidado ainda</p>}
        {guests?.map(g => (
          <div key={g.sellerId} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
            <div className="min-w-0">
              <p className="text-gray-900 text-sm font-medium line-clamp-1">{g.name}</p>
              <p className="text-gray-500 text-xs">
                @{g.username} · {g.status === 'accepted' ? 'aceitou' : 'aguardando resposta'}
              </p>
            </div>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(g.sellerId)}>
              Remover
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
