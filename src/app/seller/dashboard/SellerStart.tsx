'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, Radio } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { loadSession } from '@/components/auth/SessionSync'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/seller/FormField'
import { uploadImage } from '@/components/seller/ImageUpload'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

const toAmount = (text: string) => text.trim().replace(/\./g, '').replace(',', '.')

interface SellerStartProps {
  categories: Category[]
  sellerName: string
  // Their first time: the account becomes a seller's as soon as they start
  isSeller: boolean
  shipFromZip: string | null
}

// A seller's first minute: one screen for the first product, then straight to a live.
// Everything else (variations, package size, how they get paid) waits for the dashboard.
export function SellerStart({ categories, sellerName, isSeller, shipFromZip }: SellerStartProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const activated = useRef(isSeller)
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [category, setCategory] = useState(categories[0]?.slug ?? '')
  const [zip, setZip] = useState(shipFromZip ?? '')
  const [saving, setSaving] = useState(false)
  const [startingLive, setStartingLive] = useState(false)
  const [error, setError] = useState('')
  const [productId, setProductId] = useState<string | null>(null)

  const activate = async () => {
    if (activated.current) return true
    const res = await fetch('/api/me/seller', { method: 'POST' })
    activated.current = res.ok
    if (res.ok) await loadSession()
    return res.ok
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      if (!(await activate())) throw new Error('Não foi possível continuar. Tente novamente.')
      setImage(await uploadImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a foto')
    }
    setUploading(false)
  }

  const publish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return setError('Adicione uma foto do produto.')
    const cep = zip.replace(/\D/g, '')
    if (cep && cep.length !== 8) return setError('Confira o CEP ou deixe em branco por enquanto.')
    setSaving(true)
    setError('')
    const res = await fetch('/api/seller/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price: toAmount(price), stock, category, images: [image] }),
    })
    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null
    if (!res.ok || !data?.id) {
      setSaving(false)
      return setError(data?.message ?? 'Não foi possível publicar. Tente novamente.')
    }
    if (cep) {
      await fetch('/api/seller/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromZip: cep }),
      })
    }
    setSaving(false)
    setProductId(data.id)
  }

  const goLive = async () => {
    setStartingLive(true)
    setError('')
    const created = await fetch('/api/seller/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Ao vivo com ${sellerName}`,
        category,
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
        thumbnail: image,
        productIds: [productId],
      }),
    })
    const stream = (await created.json().catch(() => null)) as { id?: string } | null
    const started = stream?.id
      ? await fetch(`/api/seller/streams/${stream.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'live' }),
        })
      : null
    if (!stream?.id || !started?.ok) {
      setStartingLive(false)
      return setError('Não foi possível iniciar a live. Tente pelo painel.')
    }
    router.push(`/live/${stream.id}`)
  }

  if (productId) {
    return (
      <MainLayout headerProps={{ title: 'Vender ao vivo' }}>
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 text-tropical-green-700 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h1 className="text-gray-900 font-semibold text-xl mb-1">Produto publicado!</h1>
          <p className="text-gray-500 text-sm mb-6">Agora é só abrir a câmera e mostrar para os compradores.</p>
          <Button fullWidth size="lg" isLoading={startingLive} onClick={goLive}>
            <Radio className="w-5 h-5 mr-2" />
            Entrar ao vivo agora
          </Button>
          {error && <p className="text-coral-pink text-sm mt-3">{error}</p>}
          <div className="flex flex-col gap-3 mt-5 text-sm">
            <Link href="/seller/streams/new" className="text-sky-blue font-medium hover:underline">
              Agendar para depois
            </Link>
            <Link href="/seller/products/new" className="text-sky-blue font-medium hover:underline">
              Adicionar outro produto
            </Link>
            <Link href="/seller/dashboard" className="text-gray-500 hover:underline">
              Ir para o painel
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout headerProps={{ title: 'Vender ao vivo' }}>
      <form onSubmit={publish} className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-gray-900 font-semibold text-xl mb-1">Seu primeiro produto</h1>
        <p className="text-gray-500 text-sm mb-5">Leva menos de um minuto. Você pode editar tudo depois.</p>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative block w-full aspect-[4/3] rounded-md border-2 border-dashed border-gray-300 bg-white overflow-hidden mb-4"
        >
          {image ? (
            <Image src={image} alt="Foto do produto" fill className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
              {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
              {uploading ? 'Enviando…' : 'Adicionar foto'}
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />

        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            O que você vende?
            <input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Vestido floral" className={cn(inputClass, 'mt-1')} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-700">
              Preço (R$)
              <input required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="79,90" className={cn(inputClass, 'mt-1')} />
            </label>
            <label className="block text-sm text-gray-700">
              Quantidade
              <input required inputMode="numeric" value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ''))} className={cn(inputClass, 'mt-1')} />
            </label>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-1">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={cn('px-3 h-9 rounded-full border text-sm', c.slug === category ? 'border-primary bg-primary-50 text-gray-900' : 'border-gray-300 text-gray-600')}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm text-gray-700">
            CEP de onde você envia <span className="text-gray-400">(opcional)</span>
            <input inputMode="numeric" value={zip} onChange={e => setZip(e.target.value)} placeholder="00000-000" className={cn(inputClass, 'mt-1')} />
          </label>
        </div>

        {error && <p className="text-coral-pink text-sm mt-3">{error}</p>}
        <Button type="submit" fullWidth size="lg" isLoading={saving} disabled={uploading} className="mt-5">
          Publicar produto
        </Button>
        <p className="text-center mt-4">
          <Link href="/seller/dashboard?skip=1" className="text-gray-500 text-sm hover:underline">
            Fazer isso depois
          </Link>
        </p>
      </form>
    </MainLayout>
  )
}
